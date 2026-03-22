import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { ChartConfig, TabularData } from "./types";

// ============ Schemas ============

const ChartSuggestionSchema = z.object({
  type: z.enum(["bar", "line", "pie", "scatter", "area"]),
  title: z.string(),
  description: z.string(),
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
    .describe("How to aggregate Y values when there are duplicates in X"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this chart is useful for this data"),
});

const ChartSuggestionsResponseSchema = z.object({
  charts: z.array(ChartSuggestionSchema),
});

const SingleChartResponseSchema = z.object({
  chart: ChartSuggestionSchema,
});

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

// ============ Options ============

export interface AIChartOptions {
  /** Language for AI responses (e.g. "English", "French") */
  language?: string;
  /** Temperature for AI generation (default: 0.5) */
  temperature?: number;
}

// ============ Helper ============

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

// ============ Public API ============

/**
 * Generate chart suggestions from tabular data using AI.
 *
 * @param model - A LanguageModel from the `ai` SDK (any provider)
 * @param data - The tabular data to analyze
 * @param dataSummary - A text summary of the data (column stats, row counts, etc.)
 * @param options - Optional language and temperature settings
 * @returns An array of ChartConfig suggestions
 *
 * @example
 * ```ts
 * import { suggestCharts } from "csv-charts-ai";
 * import { openai } from "@ai-sdk/openai";
 *
 * const charts = await suggestCharts(
 *   openai("gpt-4o"),
 *   myData,
 *   myDataSummary,
 * );
 * ```
 */
export async function suggestCharts(
  model: LanguageModel,
  data: TabularData,
  dataSummary: string,
  options: AIChartOptions = {},
): Promise<ChartConfig[]> {
  const { language, temperature = 0.5 } = options;

  const { object } = await generateObject({
    model,
    schema: ChartSuggestionsResponseSchema,
    system: getChartSystemPrompt(data.headers, language),
    prompt: `Analyze this CSV data and suggest the best charts:\n\n${dataSummary}`,
    temperature,
  });

  return object.charts.map((s, i) =>
    mapChartResult(s, `chart-${i}-${Date.now()}`),
  );
}

/**
 * Generate a single chart from a user's text prompt.
 *
 * @param model - A LanguageModel from the `ai` SDK
 * @param data - The tabular data
 * @param dataSummary - A text summary of the data
 * @param userPrompt - The user's chart request (e.g. "show sales by month")
 * @param options - Optional language and temperature settings
 * @returns A ChartConfig or null if generation fails
 */
export async function suggestCustomChart(
  model: LanguageModel,
  data: TabularData,
  dataSummary: string,
  userPrompt: string,
  options: AIChartOptions = {},
): Promise<ChartConfig | null> {
  const { language, temperature = 0.5 } = options;

  try {
    const { object } = await generateObject({
      model,
      schema: SingleChartResponseSchema,
      system: getCustomChartPrompt(data.headers, language),
      prompt: `Data summary:\n${dataSummary}\n\nUser request: ${userPrompt}`,
      temperature,
    });

    return mapChartResult(object.chart, `chart-custom-${Date.now()}`);
  } catch (error) {
    console.error("Custom chart generation failed:", error);
    return null;
  }
}

/**
 * Repair a chart configuration that failed to render.
 *
 * @param model - A LanguageModel from the `ai` SDK
 * @param failedChart - The chart that failed
 * @param columns - Available column names
 * @param errorContext - Description of why it failed
 * @param options - Optional language and temperature settings
 * @returns A repaired ChartConfig or null
 */
export async function repairChart(
  model: LanguageModel,
  failedChart: ChartConfig,
  columns: string[],
  errorContext: string,
  options: AIChartOptions = {},
): Promise<ChartConfig | null> {
  const { language, temperature = 0.3 } = options;

  try {
    const { object } = await generateObject({
      model,
      schema: SingleChartResponseSchema,
      system: getCustomChartPrompt(columns, language),
      prompt: `The following chart configuration failed to render:\n${JSON.stringify(failedChart, null, 2)}\n\nError context: ${errorContext}\n\nPlease fix the configuration to use valid columns and aggregation. Available columns: ${columns.join(", ")}`,
      temperature,
    });

    return mapChartResult(object.chart, failedChart.id);
  } catch {
    return null;
  }
}
