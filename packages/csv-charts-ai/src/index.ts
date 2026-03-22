// React components
export { ChartDisplay } from "./ChartDisplay";
export type { ChartDisplayProps } from "./ChartDisplay";
export { SingleChart } from "./SingleChart";
export type { SingleChartProps } from "./SingleChart";
export { ChartToolbar } from "./ChartToolbar";
export { ChartThemeProvider, useChartTheme } from "./ThemeContext";

// Data processing
export { processChartData, processChartDataMultiSeries } from "./processChartData";
export type { ProcessedChartResult } from "./processChartData";
export { COLORS } from "./constants";

// Types & themes
export type {
  ChartConfig,
  TabularData,
  ChartType,
  AggregationType,
  SortOrder,
  ChartDataPoint,
  ChartTheme,
} from "./types";
export { defaultDarkTheme, defaultLightTheme } from "./types";

// AI — chart generation
export { suggestCharts, suggestCustomChart, repairChart } from "./ai";
export { createModel, summarizeTabularData, getAIErrorMessage } from "./ai";
export { AIConfigSchema, TabularDataSchema } from "./ai";
export type {
  AIConfig,
  ModelInput,
  SuggestChartsOptions,
  SuggestCustomChartOptions,
  RepairChartOptions,
} from "./ai";

// AI — data analysis
export {
  summarizeData,
  detectAnomalies,
  askAboutData,
  streamAskAboutData,
  analyzeData,
} from "./analyze";
export type {
  DataSummaryResult,
  AnomalyResult,
  AnalysisResult,
  SummarizeDataOptions,
  DetectAnomaliesOptions,
  AskAboutDataOptions,
  StreamAskAboutDataOptions,
  AnalyzeOptions,
} from "./analyze";
