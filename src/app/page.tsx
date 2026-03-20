"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DataTable } from "./_components/DataTable";
import { FullscreenCard } from "./_components/FullscreenCard";
import { ChartSuggestions } from "~/app/_components/ChartSuggestions";
import { ChartDisplay } from "~/app/_components/ChartDisplay";
import { APIKeyButton } from "~/app/_components/APIKeySettings";
import { CSVSettingsButton } from "~/app/_components/CSVSettings";
import { AIAnalysis } from "~/app/_components/AIAnalysis";
import { CSVCompare } from "~/app/_components/CSVCompare";
import { DataTransform } from "~/app/_components/DataTransform";
import { ClientOnly } from "./_components/ClientOnly";
import { LandingPage } from "./_components/landing/LandingPage";
import {
  type CSVData,
  type CSVSettings,
  DEFAULT_CSV_SETTINGS,
  parseCSV,
  generateDataSummary as generateCSVSummary,
} from "~/lib/csv-parser";
import {
  type ChartSuggestion,
  type DataSummaryResult,
  type AnomalyResult,
  generateDataSummary,
  detectAnomalies,
  generateChartSuggestions,
  repairChartSuggestion,
} from "~/lib/ai-service";
import { loadApiSettings, type StoredSettings } from "~/lib/storage";
import { Sparkles, Play, Loader2 } from "lucide-react";

export default function HomePage() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | undefined>(
    undefined,
  );
  const [csvSettings, setCsvSettings] =
    useState<CSVSettings>(DEFAULT_CSV_SETTINGS);
  const [apiSettings, setApiSettings] = useState<StoredSettings | null>(null);
  const [generatedCharts, setGeneratedCharts] = useState<ChartSuggestion[]>([]);
  const [workingData, setWorkingData] = useState<CSVData | null>(null);

  // Parallel Analysis State
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    summary: DataSummaryResult | null;
    anomalies: AnomalyResult[] | null;
    charts: ChartSuggestion[] | null;
  }>({
    summary: null,
    anomalies: null,
    charts: null,
  });
  const [chartGenerationError, setChartGenerationError] = useState<
    string | null
  >(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [anomaliesError, setAnomaliesError] = useState<string | null>(null);

  useEffect(() => {
    const settings = loadApiSettings();
    if (settings) {
      setApiSettings(settings);
    }
  }, []);

  // Data used for analysis — transformed data if available, otherwise raw
  const effectiveData = workingData ?? csvData;

  const handleFileLoaded = (content: string, fileName: string) => {
    const data = parseCSV(content, csvSettings);
    setCsvData(data);
    setCurrentFileName(fileName);
    setWorkingData(null);
    setGeneratedCharts([]);
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setChartGenerationError(null);
    setSummaryError(null);
    setAnomaliesError(null);
    toast.success("File Loaded", {
      description: `${fileName} loaded successfully with ${data.rows.length} rows`,
    });
  };

  const handleClearFile = () => {
    setCsvData(null);
    setCurrentFileName(undefined);
    setWorkingData(null);
    setGeneratedCharts([]);
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setChartGenerationError(null);
    setSummaryError(null);
    setAnomaliesError(null);
    toast.info("File Cleared", {
      description: "Ready to upload a new file",
    });
  };

  const handleDataLoaded = (data: CSVData, fileName: string) => {
    setCsvData(data);
    setCurrentFileName(fileName);
    setWorkingData(null);
    setGeneratedCharts([]);
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setChartGenerationError(null);
    setSummaryError(null);
    setAnomaliesError(null);
    toast.success("Sample Data Loaded", {
      description: `${fileName} loaded with ${data.rows.length} rows`,
    });
  };

  const handleRunAllAnalysis = async () => {
    // Allow running with custom endpoint (API key may be optional) or with OpenAI API key
    const hasValidConfig = apiSettings?.customEndpoint
      ? !!apiSettings.customModel
      : !!apiSettings?.apiKey;
    const analysisData = effectiveData ?? csvData;
    if (!analysisData || !hasValidConfig) return;

    setIsAnalyzingAll(true);
    // Reset results and errors before starting
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setGeneratedCharts([]);
    setSummaryError(null);
    setAnomaliesError(null);
    setChartGenerationError(null);
    toast.loading("Starting Analysis", {
      description: "Running complete analysis on your data...",
      id: "analysis-toast",
    });

    const config = {
      apiKey: apiSettings!.apiKey,
      model: apiSettings!.model,
      providerId: apiSettings!.providerId,
      providerNpm: apiSettings!.providerNpm,
      providerApi: apiSettings!.providerApi,
      language: apiSettings!.language,
      customEndpoint: apiSettings!.customEndpoint,
      customModel: apiSettings!.customModel,
    };

    const csvSummary = generateCSVSummary(analysisData);

    // Prepare anomaly detection sample
    const headers = analysisData.headers.join(",");
    const rows = analysisData.rows
      .slice(0, 50)
      .map((row) => row.join(","))
      .join("\n");
    const sampleCSV = `${headers}\n${rows}`;

    // Run all in parallel but update UI as each completes
    const summaryPromise = generateDataSummary(config, csvSummary)
      .then((summary) => {
        setSummaryError(null);
        setAnalysisResults((prev) => ({ ...prev, summary }));
        return summary;
      })
      .catch((error: unknown) => {
        let errorMessage = "Unable to generate summary. Please try again.";
        if (
          error instanceof Error &&
          error.message &&
          error.message.trim() !== ""
        ) {
          errorMessage = error.message;
        } else if (typeof error === "string" && error.trim() !== "") {
          errorMessage = error;
        }

        toast.error("Summary Failed", {
          description: errorMessage,
          id: "summary-error",
        });
        setSummaryError(errorMessage);
        return null;
      });

    const anomaliesPromise = detectAnomalies(config, csvSummary, sampleCSV)
      .then((anomalies) => {
        setAnomaliesError(null);
        setAnalysisResults((prev) => ({ ...prev, anomalies }));
        return anomalies;
      })
      .catch((error: unknown) => {
        let errorMessage = "Unable to detect anomalies. Please try again.";
        if (
          error instanceof Error &&
          error.message &&
          error.message.trim() !== ""
        ) {
          errorMessage = error.message;
        } else if (typeof error === "string" && error.trim() !== "") {
          errorMessage = error;
        }

        toast.error("Anomalies Failed", {
          description: errorMessage,
          id: "anomalies-error",
        });
        setAnomaliesError(errorMessage);
        return null;
      });

    const chartsPromise = generateChartSuggestions(
      config,
      csvSummary,
      analysisData.headers,
    )
      .then((charts) => {
        setChartGenerationError(null);
        setAnalysisResults((prev) => ({ ...prev, charts }));
        // Auto-generate all suggested charts
        if (charts && charts.length > 0) {
          const validCharts = charts.filter((chart) => {
            const hasValidX = analysisData.headers.includes(chart.xAxis);
            const hasValidY = analysisData.headers.includes(chart.yAxis);
            return hasValidX && hasValidY;
          });
          setGeneratedCharts(validCharts);
        }
        return charts;
      })
      .catch((error: unknown) => {
        let errorMessage = "Unable to generate charts. Please try again.";
        if (
          error instanceof Error &&
          error.message &&
          error.message.trim() !== ""
        ) {
          errorMessage = error.message;
        } else if (typeof error === "string" && error.trim() !== "") {
          errorMessage = error;
        }

        toast.error("Chart Generation Failed", {
          description: errorMessage,
          id: "charts-error",
        });
        setChartGenerationError(errorMessage);
        return null;
      });

    // Wait for all to complete before removing loading state
    await Promise.all([summaryPromise, anomaliesPromise, chartsPromise]);
    setIsAnalyzingAll(false);

    // Show toast notification when analysis is complete
    toast.success("Analysis Complete", {
      description: "Your CSV analysis has finished successfully!",
      id: "analysis-toast",
    });
  };

  const handleRegenerateChart = async (failedChart: ChartSuggestion) => {
    const hasValidConfig = apiSettings?.customEndpoint
      ? !!apiSettings.customModel
      : !!apiSettings?.apiKey;
    if (!csvData || !hasValidConfig) return;

    const config = {
      apiKey: apiSettings!.apiKey,
      model: apiSettings!.model,
      providerId: apiSettings!.providerId,
      providerNpm: apiSettings!.providerNpm,
      providerApi: apiSettings!.providerApi,
      language: apiSettings!.language,
      customEndpoint: apiSettings!.customEndpoint,
      customModel: apiSettings!.customModel,
    };

    try {
      toast.loading("Regenerating Chart", {
        description: "Attempting to fix the chart...",
        id: "regenerate-chart-toast",
      });
      const repairedChart = await repairChartSuggestion(
        config,
        failedChart,
        csvData.headers,
        "Failed to render chart with current configuration",
      );

      if (repairedChart) {
        setGeneratedCharts((prev) =>
          prev.map((c) => (c.id === failedChart.id ? repairedChart : c)),
        );
        toast.success("Chart Regenerated", {
          description: "The chart has been successfully fixed!",
          id: "regenerate-chart-toast",
        });
      } else {
        toast.error("Regeneration Failed", {
          description: "Could not repair this chart automatically.",
          id: "regenerate-chart-toast",
        });
      }
    } catch (error) {
      console.error("Failed to regenerate chart", error);
      toast.error("Regeneration Error", {
        description: "Failed to regenerate chart",
        id: "regenerate-chart-toast",
      });
    }
  };

  return (
    <ClientOnly
      fallback={
        <main className="min-h-screen bg-linear-to-b from-slate-950 to-black p-4 text-white md:p-8">
          <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        </main>
      }
    >
      <main className="min-h-screen bg-linear-to-b from-slate-950 to-black text-white">
        {/* Landing Section - Only show when no data */}
        {!csvData && (
          <LandingPage
            csvSettings={csvSettings}
            apiSettings={apiSettings}
            currentFileName={currentFileName}
            onSettingsChange={setCsvSettings}
            onApiSettingsChange={setApiSettings}
            onFileLoaded={handleFileLoaded}
            onClearFile={handleClearFile}
            onDataLoaded={handleDataLoaded}
          />
        )}

        {/* App Section - Show when data is loaded */}
        {csvData && (
          <div className="p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-8">
              {/* Header */}
              <div className="animate-fade-in flex flex-col items-center justify-between gap-4 md:flex-row">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 p-3 shadow-lg shadow-violet-500/20">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-3xl font-bold text-transparent">
                      CSV AI Analyzer
                    </h1>
                    <p className="text-gray-400">
                      Analyzing:{" "}
                      <span className="font-medium text-violet-400">
                        {currentFileName}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClearFile}
                    className="flex items-center gap-2 rounded-xl border-2 border-gray-600 bg-gray-700 px-4 py-2.5 font-medium text-white shadow-lg shadow-gray-700/25 transition-all duration-200 hover:bg-gray-600"
                  >
                    <span className="text-sm">← New File</span>
                  </button>
                  <CSVSettingsButton
                    settings={csvSettings}
                    onSettingsChange={setCsvSettings}
                  />
                  <APIKeyButton
                    onSettingsChange={setApiSettings}
                    currentSettings={apiSettings}
                  />
                </div>
              </div>

              {/* Run Complete Analysis Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleRunAllAnalysis}
                  disabled={isAnalyzingAll || !apiSettings?.apiKey}
                  className={`group relative rounded-2xl px-8 py-4 text-lg font-bold shadow-2xl transition-all duration-300 ${
                    !apiSettings?.apiKey
                      ? "cursor-not-allowed bg-gray-800 text-gray-500"
                      : "bg-linear-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white hover:scale-105 hover:shadow-violet-500/40"
                  } `}
                >
                  {isAnalyzingAll ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Running Full Analysis...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <Sparkles className="h-6 w-6 animate-pulse" />
                      Run Complete Analysis
                      <Play className="h-5 w-5 fill-current opacity-80" />
                    </span>
                  )}

                  {/* Glow effect */}
                  {!isAnalyzingAll && apiSettings?.apiKey && (
                    <div className="absolute inset-0 -z-10 rounded-2xl bg-linear-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-40 blur-xl transition-opacity group-hover:opacity-60" />
                  )}
                </button>
              </div>

              {!apiSettings?.apiKey && (
                <p className="text-center text-sm text-amber-400">
                  Please configure your API key to enable AI analysis
                </p>
              )}

              {/* Full-width Cards Stack */}
              <div className="animate-slide-up space-y-8">
                {/* Data Table - Full Width */}
                <FullscreenCard className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                  <DataTable data={csvData} />
                </FullscreenCard>

                {/* Data Transforms */}
                <DataTransform data={csvData} onTransformed={setWorkingData} />

                {/* AI Analysis - Full Width */}
                <FullscreenCard className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                  <AIAnalysis
                    data={effectiveData ?? csvData}
                    apiSettings={apiSettings}
                    externalSummary={analysisResults.summary}
                    externalAnomalies={analysisResults.anomalies}
                    externalSummaryError={summaryError}
                    externalAnomaliesError={anomaliesError}
                    disabled={isAnalyzingAll}
                  />
                </FullscreenCard>

                {/* Chart Suggestions - Full Width */}
                <FullscreenCard className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                  <ChartSuggestions
                    data={effectiveData ?? csvData}
                    apiSettings={apiSettings}
                    onChartsGenerated={setGeneratedCharts}
                    externalSuggestions={analysisResults.charts}
                    externalError={chartGenerationError}
                    disabled={isAnalyzingAll}
                  />
                </FullscreenCard>

                {generatedCharts && generatedCharts.length > 0 && (
                  <FullscreenCard className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                    <ChartDisplay
                      data={effectiveData ?? csvData}
                      charts={generatedCharts}
                      onRegenerate={handleRegenerateChart}
                    />
                  </FullscreenCard>
                )}

                {/* CSV Compare */}
                <CSVCompare
                  primaryData={effectiveData ?? csvData}
                  csvSettings={csvSettings}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </ClientOnly>
  );
}
