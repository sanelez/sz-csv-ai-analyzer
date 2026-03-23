/**
 * Bridge between the app's configuration system and the csv-charts-ai package.
 * All AI logic lives in the package — this file only handles:
 * - Converting app settings (AIServiceConfig) to a LanguageModel
 * - Re-exporting types for backwards compatibility
 */

import { type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import {
  suggestCharts,
  suggestCustomChart,
  repairChart,
  summarizeData,
  detectAnomalies as pkgDetectAnomalies,
  streamAskAboutData,
} from "csv-charts-ai";
import type {
  ChartConfig,
  TabularData,
  DataSummaryResult,
  AnomalyResult,
} from "csv-charts-ai";
import { DEFAULT_MODEL, type ModelId, type LanguageCode } from "./ai-models";

// ============ Re-exports from package ============

export type { ChartConfig as ChartSuggestion } from "csv-charts-ai";
export type { ChartType, AggregationType } from "csv-charts-ai";
export type { DataSummaryResult, AnomalyResult } from "csv-charts-ai";
export { getAIErrorMessage } from "csv-charts-ai";

export interface CustomAnalysisResult {
  response: string;
}

// ============ App-specific config ============

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

// ============ Language mapping ============

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

// ============ Model Resolution ============

/**
 * Converts the app's AIServiceConfig to a LanguageModel.
 * This is specific to the app — it handles the multi-provider settings UI.
 */
export function getModel(config: AIServiceConfig): LanguageModel {
  const modelName = config.customModel ?? config.model ?? DEFAULT_MODEL;

  if (config.customEndpoint) {
    const openai = createOpenAI({
      apiKey: config.apiKey || "",
      baseURL: config.customEndpoint,
    }) as unknown as (model: string) => LanguageModel;
    return openai(config.customModel ?? modelName);
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

// ============ Thin wrappers (delegate to package) ============

export const generateChartSuggestions = async (
  config: AIServiceConfig,
  dataSummary: string,
  columns: string[],
): Promise<ChartConfig[]> => {
  const model = getModel(config);
  return suggestCharts({
    model,
    data: {
      headers: columns,
      rows: [],
      columns: columns.map((name, index) => ({
        name,
        type: "string" as const,
        index,
      })),
      rowCount: 0,
    },
    dataSummary,
    language: LANGUAGE_NAMES[config.language ?? "en"],
  });
};

export const generateCustomChart = async (
  config: AIServiceConfig,
  dataSummary: string,
  userPrompt: string,
  columns: string[],
): Promise<ChartConfig | null> => {
  const model = getModel(config);
  return suggestCustomChart({
    model,
    data: {
      headers: columns,
      rows: [],
      columns: columns.map((name, index) => ({
        name,
        type: "string" as const,
        index,
      })),
      rowCount: 0,
    },
    dataSummary,
    prompt: userPrompt,
    language: LANGUAGE_NAMES[config.language ?? "en"],
  });
};

export const repairChartSuggestion = async (
  config: AIServiceConfig,
  failedChart: ChartConfig,
  columns: string[],
  errorContext: string,
): Promise<ChartConfig | null> => {
  const model = getModel(config);
  return repairChart({
    model,
    failedChart,
    columns,
    errorContext,
    language: LANGUAGE_NAMES[config.language ?? "en"],
  });
};

export const generateDataSummary = async (
  config: AIServiceConfig,
  dataSummary: string,
): Promise<DataSummaryResult> => {
  const model = getModel(config);
  return summarizeData({
    model,
    data: {
      headers: ["_"],
      rows: [],
      columns: [{ name: "_", type: "string", index: 0 }],
      rowCount: 0,
    },
    dataSummary,
    language: LANGUAGE_NAMES[config.language ?? "en"],
  });
};

export const detectAnomalies = async (
  config: AIServiceConfig,
  dataSummary: string,
  data: TabularData,
): Promise<AnomalyResult[]> => {
  const model = getModel(config);
  return pkgDetectAnomalies({
    model,
    data,
    dataSummary,
    language: LANGUAGE_NAMES[config.language ?? "en"],
  });
};

export const streamCustomAnalysis = async (
  config: AIServiceConfig,
  customPrompt: string,
  dataSummary: string,
  onChunk: (chunk: string) => void,
  onComplete: (fullText: string) => void,
  conversationHistory: Array<{ prompt: string; response: string }> = [],
): Promise<void> => {
  const model = getModel(config);
  return streamAskAboutData({
    model,
    data: {
      headers: ["_"],
      rows: [],
      columns: [{ name: "_", type: "string", index: 0 }],
      rowCount: 0,
    },
    question: customPrompt,
    dataSummary,
    history: conversationHistory,
    language: LANGUAGE_NAMES[config.language ?? "en"],
    onChunk,
    onComplete,
  });
};
