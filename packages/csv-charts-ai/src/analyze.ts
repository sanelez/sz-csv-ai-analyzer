import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";
import type { TabularData, ChartConfig } from "./types";
import type { ModelInput } from "./ai";
import { summarizeTabularData, getAIErrorMessage } from "./ai";
import { suggestCharts } from "./ai";

// ============ Schemas ============

const DataSummarySchema = z.object({
  summary: z.string(),
  keyInsights: z.array(z.string()),
  dataQuality: z.string(),
});

const AnomalySchema = z.object({
  row: z.number(),
  column: z.string(),
  value: z.string(),
  issue: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

const AnomaliesResponseSchema = z.object({
  anomalies: z.array(AnomalySchema),
});

// ============ Result Types ============

export interface DataSummaryResult {
  summary: string;
  keyInsights: string[];
  dataQuality: string;
}

export interface AnomalyResult {
  row: number;
  column: string;
  value: string;
  issue: string;
  severity: "low" | "medium" | "high";
}

export interface AnalysisResult {
  summary: DataSummaryResult;
  anomalies: AnomalyResult[];
  charts: ChartConfig[];
}

// ============ Prompts ============

const summarySystemPrompt = (
  language?: string,
) => `You are a data analyst.${language ? ` Respond in ${language}.` : ""}

Analyze the provided CSV data summary and provide:
1. A comprehensive summary of what this dataset represents (2-3 sentences)
2. 3-5 key insights or patterns you notice
3. An assessment of data quality (completeness, consistency)`;

const anomalySystemPrompt = (
  language?: string,
) => `You are a data quality expert.${language ? ` Respond in ${language}.` : ""}

Analyze the provided CSV data and identify anomalies, outliers, or suspicious data points.

For each anomaly found, provide:
1. Row number (1-indexed, excluding header)
2. Column name
3. The problematic value
4. Description of the issue
5. Severity (low, medium, high)

Look for:
- Missing or empty values where data is expected
- Values that don't match the expected type
- Outliers (extremely high or low values)
- Inconsistent formatting
- Invalid dates or formats

Analyze ALL rows provided. Return empty array if no anomalies found.`;

const questionSystemPrompt = (
  language?: string,
) =>
  `You are a data analysis expert.${language ? ` Respond in ${language}.` : ""}\n\nThe user will ask questions about a CSV dataset. Respond clearly and precisely.`;

// ============ Helper ============

function buildSampleCSV(data: TabularData, maxRows = 50): string {
  const header = data.headers.join(",");
  const rows = data.rows
    .slice(0, maxRows)
    .map((row) => row.join(","))
    .join("\n");
  return `${header}\n${rows}`;
}

// We need resolveModel but it's not exported from ai.ts
// Use a lazy approach: accept ModelInput and resolve internally
async function resolve(input: ModelInput) {
  // Dynamic import to avoid circular dependency
  const { createModel } = await import("./ai");
  if (typeof input === "object" && "doGenerate" in input && typeof (input as Record<string, unknown>).doGenerate === "function") {
    return input;
  }
  return createModel(input as import("./ai").AIConfig);
}

// ============ Individual Functions ============

export interface SummarizeDataOptions {
  model: ModelInput;
  data: TabularData;
  dataSummary?: string;
  language?: string;
  temperature?: number;
}

/**
 * Generate an AI summary of tabular data.
 *
 * @example
 * ```ts
 * const result = await summarizeData({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myData,
 * });
 * console.log(result.summary);
 * console.log(result.keyInsights);
 * console.log(result.dataQuality);
 * ```
 */
export async function summarizeData(
  options: SummarizeDataOptions,
): Promise<DataSummaryResult> {
  const { data, language, temperature = 0.5 } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);

  try {
    const model = await resolve(options.model);

    const { object } = await generateObject({
      model,
      schema: DataSummarySchema,
      system: summarySystemPrompt(language),
      prompt: `Here is the data to analyze:\n\n${dataSummary}`,
      temperature,
    });

    return {
      summary: object.summary,
      keyInsights: object.keyInsights,
      dataQuality: object.dataQuality,
    };
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}

export interface DetectAnomaliesOptions {
  model: ModelInput;
  data: TabularData;
  dataSummary?: string;
  /** Max rows to send for analysis (default: 50) */
  maxRows?: number;
  language?: string;
  temperature?: number;
}

/**
 * Detect anomalies in tabular data using AI.
 *
 * @example
 * ```ts
 * const anomalies = await detectAnomalies({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myData,
 * });
 * anomalies.forEach(a => console.log(`Row ${a.row}: ${a.issue}`));
 * ```
 */
export async function detectAnomalies(
  options: DetectAnomaliesOptions,
): Promise<AnomalyResult[]> {
  const { data, maxRows = 50, language, temperature = 0.3 } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);
  const sampleCSV = buildSampleCSV(data, maxRows);

  try {
    const model = await resolve(options.model);

    const { object } = await generateObject({
      model,
      schema: AnomaliesResponseSchema,
      system: anomalySystemPrompt(language),
      prompt: `Data summary:\n${dataSummary}\n\nData to analyze (CSV format):\n${sampleCSV}`,
      temperature,
    });

    return object.anomalies;
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}

export interface AskAboutDataOptions {
  model: ModelInput;
  data: TabularData;
  question: string;
  dataSummary?: string;
  /** Previous conversation messages for context */
  history?: Array<{ prompt: string; response: string }>;
  language?: string;
  temperature?: number;
}

/**
 * Ask a question about the data and get a text response.
 *
 * @example
 * ```ts
 * const answer = await askAboutData({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myData,
 *   question: "What is the average revenue by category?",
 * });
 * console.log(answer);
 * ```
 */
export async function askAboutData(
  options: AskAboutDataOptions,
): Promise<string> {
  const { data, question, history = [], language, temperature = 0.5 } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);

  try {
    const model = await resolve(options.model);

    const historyText = history
      .map((item) => `User: ${item.prompt}\nAI: ${item.response}`)
      .join("\n\n");
    const contextPrompt = historyText
      ? `Previous conversation history:\n${historyText}\n\n`
      : "";

    const { text } = await generateText({
      model,
      system: questionSystemPrompt(language),
      prompt: `Here is the data:\n\n${dataSummary}\n\n${contextPrompt}User question: ${question}`,
      temperature,
    });

    return text;
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}

export interface StreamAskAboutDataOptions extends AskAboutDataOptions {
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
}

/**
 * Ask a question with streaming response.
 *
 * @example
 * ```ts
 * await streamAskAboutData({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myData,
 *   question: "What trends do you see?",
 *   onChunk: (chunk) => process.stdout.write(chunk),
 *   onComplete: (full) => console.log("\nDone:", full.length, "chars"),
 * });
 * ```
 */
export async function streamAskAboutData(
  options: StreamAskAboutDataOptions,
): Promise<void> {
  const {
    data,
    question,
    history = [],
    language,
    temperature = 0.5,
    onChunk,
    onComplete,
  } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);

  try {
    const model = await resolve(options.model);

    const historyText = history
      .map((item) => `User: ${item.prompt}\nAI: ${item.response}`)
      .join("\n\n");
    const contextPrompt = historyText
      ? `Previous conversation history:\n${historyText}\n\n`
      : "";

    let streamError: Error | null = null;

    const result = streamText({
      model,
      system: questionSystemPrompt(language),
      prompt: `Here is the data:\n\n${dataSummary}\n\n${contextPrompt}User question: ${question}`,
      temperature,
      onError: ({ error }) => {
        streamError =
          error instanceof Error ? error : new Error(String(error));
      },
    });

    let fullText = "";

    for await (const textPart of result.textStream) {
      fullText += textPart;
      onChunk(textPart);
    }

    if (streamError) throw streamError;

    const finishReason = await result.finishReason;
    if (finishReason === "error") {
      throw new Error("The AI model encountered an error while generating the response.");
    }

    onComplete(fullText);
  } catch (error) {
    throw new Error(getAIErrorMessage(error));
  }
}

// ============ Full Pipeline ============

export interface AnalyzeOptions {
  model: ModelInput;
  data: TabularData;
  dataSummary?: string;
  language?: string;
  /** Set to false to skip anomaly detection (default: true) */
  detectAnomalies?: boolean;
  /** Set to false to skip chart suggestions (default: true) */
  suggestCharts?: boolean;
}

/**
 * Run a complete AI analysis on tabular data in one call.
 * Returns summary, anomalies, and chart suggestions.
 *
 * @example
 * ```ts
 * import { analyzeData, ChartDisplay } from "csv-charts-ai";
 *
 * const result = await analyzeData({
 *   model: { apiKey: "sk-...", model: "gpt-4o" },
 *   data: myCSVData,
 * });
 *
 * console.log(result.summary.keyInsights);
 * console.log(`Found ${result.anomalies.length} anomalies`);
 *
 * // Render charts
 * <ChartDisplay data={myCSVData} charts={result.charts} />
 * ```
 */
export async function analyzeData(
  options: AnalyzeOptions,
): Promise<AnalysisResult> {
  const {
    data,
    language,
    detectAnomalies: runAnomalies = true,
    suggestCharts: runCharts = true,
  } = options;
  const dataSummary = options.dataSummary ?? summarizeTabularData(data);

  // Run all in parallel
  const [summary, anomalies, charts] = await Promise.all([
    summarizeData({ model: options.model, data, dataSummary, language }),
    runAnomalies
      ? detectAnomalies({ model: options.model, data, dataSummary, language })
      : Promise.resolve([]),
    runCharts
      ? suggestCharts({ model: options.model, data, dataSummary, language })
      : Promise.resolve([]),
  ]);

  return { summary, anomalies, charts };
}
