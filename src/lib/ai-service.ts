import { generateText, generateObject, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { z } from "zod";
import {
  suggestCharts,
  suggestCustomChart,
  repairChart,
  type ChartConfig,
} from "csv-charts-ai";
import { DEFAULT_MODEL, type ModelId, type LanguageCode } from "./ai-models";

export type ChartType = "bar" | "line" | "pie" | "scatter" | "area";
export type AggregationType = "sum" | "avg" | "count" | "min" | "max" | "none";

export interface ChartSuggestion {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  aggregation: AggregationType;
  // New: pre-computed data for the chart
  dataConfig: {
    xColumn: string;
    yColumn: string;
    groupColumn?: string;
  };
}

export interface AIServiceConfig {
  apiKey: string;
  model?: ModelId;
  providerId?: string;
  providerNpm?: string;
  providerApi?: string;
  language?: LanguageCode;
  customEndpoint?: string;
  customModel?: string;
}

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

export interface CustomAnalysisResult {
  response: string;
}

// ============ Zod Schemas ============

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

// ============ Error Handling ============

/**
 * Extracts a user-friendly error message from API errors
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit errors
    if (message.includes("rate limit") || message.includes("429")) {
      return "Rate limit exceeded. Please wait a moment and try again, or check your API provider's usage limits.";
    }

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("invalid api key") ||
      message.includes("invalid_api_key")
    ) {
      return "Invalid API key. Please check your API key configuration.";
    }

    // Quota/billing errors
    if (
      message.includes("quota") ||
      message.includes("insufficient_quota") ||
      message.includes("billing")
    ) {
      return "API quota exceeded or billing issue. Please check your account status.";
    }

    // Network/timeout errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("fetch failed")
    ) {
      return "Network error. Please check your internet connection and try again.";
    }

    // Model not found
    if (
      message.includes("model") &&
      (message.includes("not found") || message.includes("does not exist"))
    ) {
      return "Model not available. Please select a different model or check your provider settings.";
    }

    // Generic API errors
    if (
      message.includes("api error") ||
      message.includes("server error") ||
      message.includes("500")
    ) {
      return `API error: ${error.message}`;
    }

    // Return original message if no specific pattern matched
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

// ============ Language Support ============

const LANGUAGE_INSTRUCTION: Record<LanguageCode, string> = {
  en: "Respond in English.",
  fr: "Réponds en français.",
  de: "Antworte auf Deutsch.",
  es: "Responde en español.",
  it: "Rispondi in italiano.",
  pt: "Responda em português.",
  nl: "Antwoord in het Nederlands.",
  ja: "日本語で回答してください。",
  zh: "请用中文回答。",
};

// ============ Prompts ============

const getDataSummaryPrompt = (
  language: LanguageCode,
) => `You are a data analyst. ${LANGUAGE_INSTRUCTION[language]}

Analyze the provided CSV data summary and provide:
1. A comprehensive summary of what this dataset represents (2-3 sentences)
2. 3-5 key insights or patterns you notice
3. An assessment of data quality (completeness, consistency)`;

const getAnomalyPrompt = (
  language: LanguageCode,
) => `You are a data quality expert. ${LANGUAGE_INSTRUCTION[language]}

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

const getCustomAnalysisPrompt = (
  language: LanguageCode,
) => `You are a data analysis expert. ${LANGUAGE_INSTRUCTION[language]}

The user will ask questions about a CSV dataset. Respond clearly and precisely.`;

// ============ Provider Helper ============

function getModel(config: AIServiceConfig): LanguageModel {
  const modelName = config.customModel ?? config.model ?? DEFAULT_MODEL;

  if (config.customEndpoint) {
    // For custom endpoints (Ollama/LM Studio/vLLM etc.) use OpenAI SDK with custom baseURL
    const openai = createOpenAI({
      apiKey: config.apiKey || "",
      baseURL: config.customEndpoint,
    }) as unknown as (model: string) => LanguageModel;
    const chosen = config.customModel ?? modelName;
    return openai(chosen);
  }

  switch (config.providerNpm) {
    case "@ai-sdk/anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      });
      return anthropic(modelName);
    }
    case "@ai-sdk/google": {
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      return google(modelName);
    }
    case "@ai-sdk/mistral": {
      const mistral = createMistral({ apiKey: config.apiKey });
      return mistral(modelName);
    }
    default: {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.providerApi,
      }) as unknown as (model: string) => LanguageModel;
      return openai(modelName);
    }
  }
}

// ============ Chart Suggestions (delegated to csv-charts-ai) ============

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ja: "Japanese",
  zh: "Chinese",
};

export const generateChartSuggestions = async (
  config: AIServiceConfig,
  dataSummary: string,
  columns: string[],
): Promise<ChartSuggestion[]> => {
  const model = getModel(config);
  const language = config.language ?? "en";

  try {
    const results = await suggestCharts(
      model,
      { headers: columns, rows: [], columns: [], rowCount: 0 },
      dataSummary,
      { language: LANGUAGE_NAMES[language] },
    );
    return results as unknown as ChartSuggestion[];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const generateCustomChart = async (
  config: AIServiceConfig,
  dataSummary: string,
  userPrompt: string,
  columns: string[],
): Promise<ChartSuggestion | null> => {
  const model = getModel(config);
  const language = config.language ?? "en";

  const result = await suggestCustomChart(
    model,
    { headers: columns, rows: [], columns: [], rowCount: 0 },
    dataSummary,
    userPrompt,
    { language: LANGUAGE_NAMES[language] },
  );
  return result as unknown as ChartSuggestion | null;
};

export const repairChartSuggestion = async (
  config: AIServiceConfig,
  failedChart: ChartSuggestion,
  columns: string[],
  errorContext: string,
): Promise<ChartSuggestion | null> => {
  const model = getModel(config);
  const language = config.language ?? "en";

  const result = await repairChart(
    model,
    failedChart as unknown as ChartConfig,
    columns,
    errorContext,
    { language: LANGUAGE_NAMES[language] },
  );
  return result as unknown as ChartSuggestion | null;
};

// ============ Data Summary ============

export const generateDataSummary = async (
  config: AIServiceConfig,
  dataSummary: string,
): Promise<DataSummaryResult> => {
  const model = getModel(config);
  const language = config.language ?? "en";

  try {
    const { object } = await generateObject({
      model,
      schema: DataSummarySchema,
      system: getDataSummaryPrompt(language),
      prompt: `Here is the data to analyze:\n\n${dataSummary}`,
      temperature: 0.5,
    });

    return {
      summary: object.summary,
      keyInsights: object.keyInsights,
      dataQuality: object.dataQuality,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ============ Anomaly Detection ============

export const detectAnomalies = async (
  config: AIServiceConfig,
  dataSummary: string,
  sampleRows: string,
): Promise<AnomalyResult[]> => {
  const model = getModel(config);
  const language = config.language ?? "en";

  try {
    const { object } = await generateObject({
      model,
      schema: AnomaliesResponseSchema,
      system: getAnomalyPrompt(language),
      prompt: `Data summary:\n${dataSummary}\n\nData to analyze (CSV format):\n${sampleRows}`,
      temperature: 0.3,
    });

    return object.anomalies;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ============ Custom Analysis ============

export const runCustomAnalysis = async (
  config: AIServiceConfig,
  customPrompt: string,
  dataSummary: string,
): Promise<CustomAnalysisResult> => {
  const model = getModel(config);
  const language = config.language ?? "en";

  const { text } = await generateText({
    model,
    system: getCustomAnalysisPrompt(language),
    prompt: `Here is the data:\n\n${dataSummary}\n\nUser question: ${customPrompt}`,
    temperature: 0.5,
  });

  return { response: text };
};

// ============ Streaming Custom Analysis ============

export const streamCustomAnalysis = async (
  config: AIServiceConfig,
  customPrompt: string,
  dataSummary: string,
  onChunk: (chunk: string) => void,
  onComplete: (fullText: string) => void,
  conversationHistory: Array<{ prompt: string; response: string }> = [],
): Promise<void> => {
  try {
    const { streamText } = await import("ai");
    const model = getModel(config);
    const language = config.language ?? "en";

    // Format history for context
    const historyText = conversationHistory
      .map((item) => `User: ${item.prompt}\nAI: ${item.response}`)
      .join("\n\n");

    const contextPrompt = historyText
      ? `Previous conversation history:\n${historyText}\n\n`
      : "";

    // Track any error that occurs during streaming
    let streamError: Error | null = null;

    const result = streamText({
      model,
      system: getCustomAnalysisPrompt(language),
      prompt: `Here is the data:\n\n${dataSummary}\n\n${contextPrompt}User question: ${customPrompt}`,
      temperature: 0.5,
      onError: ({ error }) => {
        // Capture streaming errors via the onError callback
        streamError = error instanceof Error ? error : new Error(String(error));
        console.error("Stream error captured:", streamError.message);
      },
    });

    let fullText = "";

    try {
      for await (const textPart of result.textStream) {
        fullText += textPart;
        onChunk(textPart);
      }
    } catch (iterationError) {
      // Handle errors that occur during stream iteration
      throw iterationError;
    }

    // Check if an error was captured during streaming
    if (streamError) {
      throw streamError;
    }

    // Also check the finish reason for errors
    const finishReason = await result.finishReason;
    if (finishReason === "error") {
      throw new Error(
        "The AI model encountered an error while generating the response.",
      );
    }

    onComplete(fullText);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
