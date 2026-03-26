"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { toast } from "sonner";
import { DataTable } from "./_components/DataTable";
import { FullscreenCard } from "./_components/FullscreenCard";
import { ChartDisplay } from "~/app/_components/ChartDisplay";
import { APIKeyButton } from "~/app/_components/APIKeySettings";
import { CSVSettingsButton } from "~/app/_components/CSVSettings";
import { ClientOnly } from "./_components/ClientOnly";
import { ThemeToggle } from "./_components/ThemeToggle";
import { LandingPage } from "./_components/landing/LandingPage";

// Lazy-load heavy components to reduce initial bundle size
const ChartSuggestions = lazy(() =>
  import("~/app/_components/ChartSuggestions").then((m) => ({
    default: m.ChartSuggestions,
  })),
);
const AIAnalysis = lazy(() =>
  import("~/app/_components/AIAnalysis").then((m) => ({
    default: m.AIAnalysis,
  })),
);
const CSVCompare = lazy(() =>
  import("~/app/_components/CSVCompare").then((m) => ({
    default: m.CSVCompare,
  })),
);
const DataTransform = lazy(() =>
  import("~/app/_components/DataTransform").then((m) => ({
    default: m.DataTransform,
  })),
);
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
import { clearChatStore } from "~/lib/chat-store";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";

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
    clearChatStore();
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
    clearChatStore();
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
    clearChatStore();
    toast.success("Sample Data Loaded", {
      description: `${fileName} loaded with ${data.rows.length} rows`,
    });
  };

  const hasValidConfig = apiSettings?.customEndpoint
    ? !!apiSettings.customModel
    : !!apiSettings?.apiKey;

  const handleRunAllAnalysis = async () => {
    const analysisData = effectiveData ?? csvData;
    if (!analysisData || !hasValidConfig) return;

    setIsAnalyzingAll(true);
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

    const anomaliesPromise = detectAnomalies(config, csvSummary, analysisData)
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

    await Promise.all([summaryPromise, anomaliesPromise, chartsPromise]);
    setIsAnalyzingAll(false);

    toast.success("Analysis Complete", {
      description: "Your CSV analysis has finished successfully!",
      id: "analysis-toast",
    });
  };

  const handleRegenerateChart = async (failedChart: ChartSuggestion) => {
    const hasValidCfg = apiSettings?.customEndpoint
      ? !!apiSettings.customModel
      : !!apiSettings?.apiKey;
    if (!csvData || !hasValidCfg) return;

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
      const message =
        error instanceof Error ? error.message : "Failed to regenerate chart";
      toast.error("Regeneration Error", {
        description: message,
        id: "regenerate-chart-toast",
      });
    }
  };

  return (
    <ClientOnly
      fallback={
        <main className="min-h-screen p-4 md:p-8">
          <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center">
            <div
              className="animate-pulse"
              style={{ color: "var(--text-secondary)" }}
            >
              Loading...
            </div>
          </div>
        </main>
      }
    >
      <main className="min-h-screen">
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
          <div className="pb-12">
            {/* Sticky Header Bar */}
            <header
              className="sticky top-0 z-40 border-b backdrop-blur-xl"
              style={{
                borderColor: "var(--border-glass)",
                backgroundColor:
                  "color-mix(in srgb, var(--bg-body-start) 80%, transparent)",
              }}
            >
              <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
                {/* Left: Back + File info */}
                <button
                  onClick={handleClearFile}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                  title="Load a different file"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-sm font-semibold text-white">
                      {currentFileName}
                    </h1>
                    <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {csvData.rowCount} rows
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <ThemeToggle />
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
            </header>

            {/* Content */}
            <div className="mx-auto max-w-7xl space-y-10 px-4 pt-8 md:px-8">
              {/* ── Data Section ── */}
              <section>
                <SectionLabel label="Data" />
                <div className="space-y-4">
                  {/* Data Table - Full width */}
                  <FullscreenCard className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                    <DataTable data={csvData} />
                  </FullscreenCard>

                  {/* Data Transform + CSV Compare - Side by side */}
                  <Suspense fallback={<LazyFallback />}>
                    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                      <FullscreenCard className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                        <DataTransform
                          data={csvData}
                          onTransformed={setWorkingData}
                        />
                      </FullscreenCard>

                      <FullscreenCard className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                        <CSVCompare
                          primaryData={csvData}
                          primaryFileName={currentFileName}
                          csvSettings={csvSettings}
                        />
                      </FullscreenCard>
                    </div>
                  </Suspense>
                </div>
              </section>

              {/* ── AI Insights Section ── */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                    AI Insights
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <button
                    onClick={handleRunAllAnalysis}
                    disabled={isAnalyzingAll || !hasValidConfig}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-all duration-200 ${
                      !hasValidConfig
                        ? "cursor-not-allowed bg-gray-800 text-gray-500 shadow-none"
                        : "bg-linear-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/20 hover:shadow-violet-500/40 hover:brightness-110"
                    } disabled:hover:brightness-100`}
                    title={
                      !hasValidConfig
                        ? "Configure your API key first"
                        : "Run all AI analyses at once"
                    }
                  >
                    {isAnalyzingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Run Complete Analysis
                      </>
                    )}
                  </button>
                </div>
                <Suspense fallback={<LazyFallback />}>
                  <div className="space-y-4">
                    <FullscreenCard className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                      <AIAnalysis
                        data={effectiveData ?? csvData}
                        fileName={currentFileName}
                        apiSettings={apiSettings}
                        externalSummary={analysisResults.summary}
                        externalAnomalies={analysisResults.anomalies}
                        externalSummaryError={summaryError}
                        externalAnomaliesError={anomaliesError}
                        disabled={isAnalyzingAll}
                      />
                    </FullscreenCard>

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
                  </div>
                </Suspense>
              </section>
            </div>
          </div>
        )}
      </main>
    </ClientOnly>
  );
}

/** Loading placeholder for lazy-loaded components */
function LazyFallback() {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/50">
      <div className="animate-pulse text-sm text-gray-500">Loading...</div>
    </div>
  );
}

/** Subtle section divider with label */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}
