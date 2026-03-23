import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { ChartConfig, TabularData } from "./types";

// ============ Input Validation Schemas ============

/** Zod schema for simple API config (OpenAI-compatible endpoints) */
export const AIConfigSchema = z.object({
  /** API key for authentication */
  apiKey: z.string(),
  /** Model identifier (e.g. "gpt-4o", "llama3", "mistral-large") */
  model: z.string(),
  /** Custom base URL for non-OpenAI providers (Ollama, vLLM, Mistral, etc.) */
  baseURL: z.string().optional(),
  /** Provider hint — used to dynamically load the right SDK. Defaults to "openai". */
  provider: z
    .enum(["openai", "anthropic", "google", "mistral"])
    .optional()
    .default("openai"),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

/** Zod schema for TabularData validation */
export const TabularDataSchema = z.object({
  headers: z.array(z.string()).min(1, "Data must have at least one column"),
  rows: z.array(z.array(z.string())),
  columns: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["string", "number", "date", "boolean"]),
      index: z.number(),
    }),
  ),
  rowCount: z.number(),
});

/** Model input: either a simple config object or a pre-built LanguageModel */
export type ModelInput = AIConfig | LanguageModel;

// ============ Chart Output Schemas ============

const ChartSuggestionSchema = z.object({
  type: z.enum(["bar", "line", "pie", "scatter", "area"]),
  title: z.string(),
  description: z
    .string()
    .optional()
    .default("")
    .describe("Short description of what the chart shows"),
  xColumn: z
    .string()
    .describe("The EXACT column name to use for X axis (categories/labels)"),
  yColumn: z
    .string()
    .describe("The EXACT column name to use for Y axis (values)"),
  groupColumn: z
    .string()
    .optional()
    .describe("Optional column to group/segment the data"),
  aggregation: z
    .enum(["sum", "avg", "count", "min", "max", "none"])
    .optional()
    .default("none")
    .describe("How to aggregate Y values when there are duplicates in X"),
  reasoning: z
    .string()
    .optional()
    .default("")
    .describe("Brief explanation of why this chart is useful for this data"),
});

const ChartSuggestionsResponseSchema = z.object({
  charts: z.array(ChartSuggestionSchema),
});

const SingleChartResponseSchema = z.object({
  chart: ChartSuggestionSchema,
});

// ============ Error Handling ============

/**
 * Extracts a user-friendly error message from AI provider errors.
 * Exported so consumers can use it in their own error handling.
 */
export function getAIErrorMessage(error: unknown): string {
  // Handle Zod validation errors
  if (
    error instanceof Error &&
    error.name === "ZodError" &&
    "issues" in error
  ) {
    const issues = (error as { issues: Array<{ message: string }> }).issues;
    return `Invalid data: ${issues.map((i) => i.message).join(", ")}`;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("rate limit") || message.includes("429")) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    if (
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("invalid api key") ||
      message.includes("invalid_api_key")
    ) {
      return "Invalid API key. Please check your API key configuration.";
    }
    if (
      message.includes("quota") ||
      message.includes("insufficient_quota") ||
      message.includes("billing")
    ) {
      return "API quota exceeded or billing issue. Please check your account status.";
    }
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("fetch failed")
    ) {
      return "Network error. Please check your internet connection and try again.";
    }
    if (
      message.includes("model") &&
      (message.includes("not found") || message.includes("does not exist"))
    ) {
      return "Model not available. Please select a different model.";
    }

    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

// ============ Data Summary Generation ============

/**
 * Generate a text summary of tabular data for AI consumption.
 * If the consumer doesn't provide a `dataSummary`, this is used automatically.
 */
export function summarizeTabularData(data: TabularData): string {
  const lines: string[] = [];
  lines.push(`Dataset: ${data.rowCount} rows, ${data.headers.length} columns`);
  lines.push(`Columns: ${data.headers.join(", ")}`);
  lines.push("");

  for (const col of data.columns) {
    const idx = col.index;
    const values = data.rows.map((r) => r[idx] ?? "").filter((v) => v !== "");

    if (col.type === "number") {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      if (nums.length > 0) {
        const min = nums.reduce((a, b) => (b < a ? b : a), nums[0]!);
        const max = nums.reduce((a, b) => (b > a ? b : a), nums[0]!);
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        lines.push(
          `- ${col.name} (${col.type}): min=${min}, max=${max}, avg=${avg.toFixed(2)}, ${nums.length} values`,
        );
      } else {
        lines.push(`- ${col.name} (${col.type}): no valid numeric values`);
      }
    } else {
      const distinct = new Set(values).size;
      const sample = values.slice(0, 5).join(", ");
      lines.push(
        `- ${col.name} (${col.type}): ${distinct} distinct values, sample: [${sample}]`,
      );
    }
  }

  return lines.join("\n");
}

// ============ Model Resolution ============

function isLanguageModel(input: unknown): input is LanguageModel {
  return (
    typeof input === "object" &&
    input !== null &&
    "doGenerate" in input &&
    typeof (input as Record<string, unknown>).doGenerate === "function"
  );
}

/**
 * Create a LanguageModel from an AIConfig.
 * Exported so consumers can create a model once and reuse it.
 *
 * @example
 * ```ts
 * const model = await createModel({ apiKey: "sk-...", model: "gpt-4o" });
 * const charts1 = await suggestCharts({ model, data, dataSummary });
 * const charts2 = await suggestCustomChart({ model, data, dataSummary, prompt: "..." });
 * ```
 */
export async function createModel(config: AIConfig): Promise<LanguageModel> {
  const parsed = AIConfigSchema.parse(config);

  if (parsed.baseURL || parsed.provider === "openai") {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const openai = createOpenAI({
      apiKey: parsed.apiKey,
      ...(parsed.baseURL && { baseURL: parsed.baseURL }),
    }) as unknown as (model: string) => LanguageModel;
    return openai(parsed.model);
  }

  switch (parsed.provider) {
    case "anthropic": {
      try {
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        return createAnthropic({ apiKey: parsed.apiKey })(parsed.model);
      } catch {
        throw new Error(
          'Provider "anthropic" requires @ai-sdk/anthropic. Install it: pnpm add @ai-sdk/anthropic',
        );
      }
    }
    case "google": {
      try {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        return createGoogleGenerativeAI({ apiKey: parsed.apiKey })(
          parsed.model,
        );
      } catch {
        throw new Error(
          'Provider "google" requires @ai-sdk/google. Install it: pnpm add @ai-sdk/google',
        );
      }
    }
    case "mistral": {
      try {
        const { createMistral } = await import("@ai-sdk/mistral");
        return createMistral({ apiKey: parsed.apiKey })(parsed.model);
      } catch {
        throw new Error(
          'Provider "mistral" requires @ai-sdk/mistral. Install it: pnpm add @ai-sdk/mistral',
        );
      }
    }
    default: {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const openai = createOpenAI({
        apiKey: parsed.apiKey,
      }) as unknown as (model: string) => LanguageModel;
      return openai(parsed.model);
    }
  }
}

export async function resolveModel(input: ModelInput): Promise<LanguageModel> {
  if (isLanguageModel(input)) return input;
  return createModel(input as AIConfig);
}

// ============ Prompts ============

const getChartSystemPrompt = (
  columns: string[],
  language?: string,
) => `You are a data visualization expert.${language ? ` Respond in ${language}.` : ""}

You will analyze CSV data and suggest the best charts to visualize it.

AVAILABLE COLUMNS (use these EXACT names):
${columns.map((c) => `- "${c}"`).join("\n")}

CRITICAL RULES:
1. xColumn and yColumn MUST be exact column names from the list above
2. For numeric analysis, yColumn should be a numeric column
3. For categorical comparisons, xColumn should be a categorical column
4. Only suggest charts that make sense for the data types
5. Use aggregation when there are multiple rows per category:
   - "sum" for totals (sales, revenue)
   - "avg" for averages (ratings, scores)
   - "count" for frequencies
   - "none" for unique values or time series
6. Suggest 2-4 charts maximum, focusing on the most insightful ones

CHART TYPE GUIDELINES:
- bar: Compare categories (xColumn=category, yColumn=numeric)
- line: Show trends over time (xColumn=date/time, yColumn=numeric)
- pie: Show proportions (xColumn=category, yColumn=numeric with sum/count)
- scatter: Show correlations (xColumn=numeric, yColumn=numeric, aggregation=none)
- area: Show cumulative trends (xColumn=date/time, yColumn=numeric)`;

const getCustomChartPrompt = (
  columns: string[],
  language?: string,
) => `You are a data visualization expert.${language ? ` Respond in ${language}.` : ""}

Create a chart configuration based on the user's request.

AVAILABLE COLUMNS (use these EXACT names):
${columns.map((c) => `- "${c}"`).join("\n")}

IMPORTANT: Column names MUST exactly match the list above.`;

// ============ Helpers ============

function mapChartResult(
  raw: z.infer<typeof ChartSuggestionSchema>,
  id: string,
): ChartConfig {
  return {
    id,
    type: raw.type,
    title: raw.title,
    description: raw.description,
    xAxis: raw.xColumn,
    yAxis: raw.yColumn,
    groupBy: raw.groupColumn,
    aggregation: raw.aggregation,
    dataConfig: {
      xColumn: raw.xColumn,
      yColumn: raw.yColumn,
      groupColumn: raw.groupColumn,
    },
  };
}

// ============ Options ============

export interface SuggestChartsOptions {
  /** The AI model — either a simple config or a LanguageModel instance */
  model: ModelInput;
  /** The tabular data to analyze */
  data: TabularData;
  /** A text summary of the data. If omitted, auto-generated from `data`. */
  dataSummary?: string;
  /** Language for AI responses (e.g. "English", "French") */
  language?: string;
  /** Temperature for AI generation (default: 0.5) */
  temperature?: number;
  /** AbortSignal to cancel the request */
  signal?: AbortSignal;
}

export interface SuggestCustomChartOptions {
  /** The AI model — either a simple config or a LanguageModel instance */
  model: ModelInput;
  /** The tabular data */
  data: TabularData;
  /** A text summary of the data. If omitted, auto-generated from `data`. */
  dataSummary?: string;
  /** The user's chart request (e.g. "show sales by month") */
  prompt: string;
  /** Language for AI responses */
  language?: string;
  /** Temperature (default: 0.5) */
  temperature?: number;
  /** AbortSignal to cancel the request */
  signal?: AbortSignal;
}

export interface RepairChartOptions {
  /** The AI model — either a simple config or a LanguageModel instance */
  model: ModelInput;
  /** The chart configuration that failed */
  failedChart: ChartConfig;
  /** Available column names */
  columns: string[];
  /** Description of why the chart failed */
  errorContext: string;
  /** Language for AI responses */
  language?: string;
  /** Temperature (default: 0.3) */
  temperature?: number;
  /** AbortSignal to cancel the request */
  signal?: AbortSignal;
}

// ============ Public API ============

/**
 * Generate chart suggestions from tabular data using AI.
 *
 * @example
 * ```ts
 * import { suggestCharts } from "csv-charts-ai";
 *
 * // Minimal — auto-generates dataSummary from the data
 * const charts = await suggestCharts({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myData,
 * });
 *
 * // Custom endpoint — Ollama
 * const charts = await suggestCharts({
 *   model: { apiKey: "", model: "llama3", baseURL: "http://localhost:11434/v1" },
 *   data: myData,
 * });
 *
 * // Advanced — any LanguageModel from the ai SDK
 * import { anthropic } from "@ai-sdk/anthropic";
 * const charts = await suggestCharts({
 *   model: anthropic("claude-sonnet-4-20250514"),
 *   data: myData,
 *   language: "French",
 * });
 * ```
 */
export async function suggestCharts(
  options: SuggestChartsOptions,
): Promise<ChartConfig[]> {
  const { data, language, temperature = 0.5, signal } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);

  try {
    TabularDataSchema.parse(data);
    const model = await resolveModel(options.model);

    const { object } = await generateObject({
      model,
      schema: ChartSuggestionsResponseSchema,
      system: getChartSystemPrompt(data.headers, language),
      prompt: `Analyze this CSV data and suggest the best charts:\n\n${dataSummary}`,
      temperature,
      ...(signal && { abortSignal: signal }),
    });

    return object.charts.map((s, i) =>
      mapChartResult(s, `chart-${i}-${Date.now()}`),
    );
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}

/**
 * Generate a single chart from a user's text prompt.
 *
 * @example
 * ```ts
 * const chart = await suggestCustomChart({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myData,
 *   prompt: "Show me a bar chart of sales by category",
 * });
 * ```
 */
export async function suggestCustomChart(
  options: SuggestCustomChartOptions,
): Promise<ChartConfig | null> {
  const { data, prompt, language, temperature = 0.5, signal } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);

  try {
    TabularDataSchema.parse(data);
    const model = await resolveModel(options.model);

    const { object } = await generateObject({
      model,
      schema: SingleChartResponseSchema,
      system: getCustomChartPrompt(data.headers, language),
      prompt: `Data summary:\n${dataSummary}\n\nUser request: ${prompt}`,
      temperature,
      ...(signal && { abortSignal: signal }),
    });

    return mapChartResult(object.chart, `chart-custom-${Date.now()}`);
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}

/**
 * Repair a chart configuration that failed to render.
 *
 * @example
 * ```ts
 * const fixed = await repairChart({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   failedChart: brokenChart,
 *   columns: ["name", "sales", "date"],
 *   errorContext: "Column 'revenue' does not exist",
 * });
 * ```
 */
export async function repairChart(
  options: RepairChartOptions,
): Promise<ChartConfig | null> {
  const {
    failedChart,
    columns,
    errorContext,
    language,
    temperature = 0.3,
    signal,
  } = options;

  try {
    const model = await resolveModel(options.model);

    const { object } = await generateObject({
      model,
      schema: SingleChartResponseSchema,
      system: getCustomChartPrompt(columns, language),
      prompt: `The following chart configuration failed to render:\n${JSON.stringify(failedChart, null, 2)}\n\nError context: ${errorContext}\n\nPlease fix the configuration to use valid columns and aggregation. Available columns: ${columns.join(", ")}`,
      temperature,
      ...(signal && { abortSignal: signal }),
    });

    return mapChartResult(object.chart, failedChart.id);
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}
