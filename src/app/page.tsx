"use client";

import { useState, useEffect } from "react";
import { DataTable } from "./_components/DataTable";
import { FullscreenCard } from "./_components/FullscreenCard";
import { ChartSuggestions } from "~/app/_components/ChartSuggestions";
import { ChartDisplay } from "~/app/_components/ChartDisplay";
import { APIKeyButton } from "~/app/_components/APIKeySettings";
import { CSVSettingsButton } from "~/app/_components/CSVSettings";
import { AIAnalysis } from "~/app/_components/AIAnalysis";
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
  const [currentFileName, setCurrentFileName] = useState<string | undefined>(undefined);
  const [csvSettings, setCsvSettings] = useState<CSVSettings>(DEFAULT_CSV_SETTINGS);
  const [apiSettings, setApiSettings] = useState<StoredSettings | null>(null);
  const [generatedCharts, setGeneratedCharts] = useState<ChartSuggestion[]>([]);

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
  const [chartGenerationError, setChartGenerationError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [anomaliesError, setAnomaliesError] = useState<string | null>(null);

  useEffect(() => {
    const settings = loadApiSettings();
    if (settings) {
      setApiSettings(settings);
    }
  }, []);

  const handleFileLoaded = (content: string, fileName: string) => {
    const data = parseCSV(content, csvSettings);
    setCsvData(data);
    setCurrentFileName(fileName);
    setGeneratedCharts([]);
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setChartGenerationError(null);
    setSummaryError(null);
    setAnomaliesError(null);
  };

  const handleClearFile = () => {
    setCsvData(null);
    setCurrentFileName(undefined);
    setGeneratedCharts([]);
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setChartGenerationError(null);
    setSummaryError(null);
    setAnomaliesError(null);
  };

  const handleDataLoaded = (data: CSVData, fileName: string) => {
    setCsvData(data);
    setCurrentFileName(fileName);
    setGeneratedCharts([]);
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setChartGenerationError(null);
    setSummaryError(null);
    setAnomaliesError(null);
  };

  const handleRunAllAnalysis = async () => {
    // Allow running with custom endpoint (API key may be optional) or with OpenAI API key
    const hasValidConfig = apiSettings?.customEndpoint ? !!apiSettings.customModel : !!apiSettings?.apiKey;
    if (!csvData || !hasValidConfig) return;

    setIsAnalyzingAll(true);
    // Reset results before starting
    setAnalysisResults({ summary: null, anomalies: null, charts: null });
    setGeneratedCharts([]);

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

    const csvSummary = generateCSVSummary(csvData);

    // Prepare anomaly detection sample
    const headers = csvData.headers.join(",");
    const rows = csvData.rows
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
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Unable to generate summary. Please try again.";
        console.error("Summary failed:", errorMessage);
        setSummaryError(errorMessage);
        return null;
      });

    const anomaliesPromise = detectAnomalies(config, csvSummary, sampleCSV)
      .then((anomalies) => {
        setAnomaliesError(null);
        setAnalysisResults((prev) => ({ ...prev, anomalies }));
        return anomalies;
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Unable to detect anomalies. Please try again.";
        console.error("Anomalies failed:", errorMessage);
        setAnomaliesError(errorMessage);
        return null;
      });

    const chartsPromise = generateChartSuggestions(config, csvSummary, csvData.headers)
      .then((charts) => {
        setChartGenerationError(null);
        setAnalysisResults((prev) => ({ ...prev, charts }));
        // Auto-generate all suggested charts
        if (charts && charts.length > 0) {
          const validCharts = charts.filter(chart => {
            const hasValidX = csvData.headers.includes(chart.xAxis);
            const hasValidY = csvData.headers.includes(chart.yAxis);
            return hasValidX && hasValidY;
          });
          setGeneratedCharts(validCharts);
        }
        return charts;
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Unable to generate charts. Please try again.";
        console.error("Charts failed:", errorMessage);
        setChartGenerationError(errorMessage);
        return null;
      });

    // Wait for all to complete before removing loading state
    await Promise.all([summaryPromise, anomaliesPromise, chartsPromise]);
    setIsAnalyzingAll(false);
  };

  const handleRegenerateChart = async (failedChart: ChartSuggestion) => {
    const hasValidConfig = apiSettings?.customEndpoint ? !!apiSettings.customModel : !!apiSettings?.apiKey;
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
      const repairedChart = await repairChartSuggestion(
        config,
        failedChart,
        csvData.headers,
        "Failed to render chart with current configuration"
      );

      if (repairedChart) {
        setGeneratedCharts((prev) =>
          prev.map((c) => (c.id === failedChart.id ? repairedChart : c))
        );
      } else {
        alert("Could not repair this chart automatically.");
      }
    } catch (error) {
      console.error("Failed to regenerate chart", error);
      alert("Failed to regenerate chart");
    }
  };

  return (
    <ClientOnly fallback={
      <main className="min-h-screen bg-linear-to-b from-slate-950 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </main>
    }>
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
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
                      CSV AI Analyzer
                    </h1>
                    <p className="text-gray-400">
                      Analyzing: <span className="text-violet-400 font-medium">{currentFileName}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClearFile}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 border-2 border-gray-600 text-white font-medium hover:bg-gray-600 transition-all duration-200 shadow-lg shadow-gray-700/25"
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
                  className={`
                      group relative px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300
                      ${!apiSettings?.apiKey
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-linear-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:scale-105 hover:shadow-violet-500/40 text-white"
                    }
                    `}
                >
                  {isAnalyzingAll ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Running Full Analysis...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                      Run Complete Analysis
                      <Play className="w-5 h-5 fill-current opacity-80" />
                    </span>
                  )}

                  {/* Glow effect */}
                    {!isAnalyzingAll && apiSettings?.apiKey && (
                    <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-violet-600 via-fuchsia-600 to-pink-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity -z-10" />
                  )}
                </button>
              </div>

              {!apiSettings?.apiKey && (
                <p className="text-center text-amber-400 text-sm">
                  Please configure your API key to enable AI analysis
                </p>
              )}

              {/* Full-width Cards Stack */}
              <div className="space-y-8 animate-slide-up">
                {/* Data Table - Full Width */}
                <FullscreenCard className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                  <DataTable data={csvData} />
                </FullscreenCard>

                {/* AI Analysis - Full Width */}
                <FullscreenCard className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                  <AIAnalysis
                    data={csvData}
                    apiSettings={apiSettings}
                    externalSummary={analysisResults.summary}
                    externalAnomalies={analysisResults.anomalies}
                    externalSummaryError={summaryError}
                    externalAnomaliesError={anomaliesError}
                    disabled={isAnalyzingAll}
                  />
                </FullscreenCard>

                {/* Chart Suggestions - Full Width */}
                <FullscreenCard className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                  <ChartSuggestions
                    data={csvData}
                    apiSettings={apiSettings}
                    onChartsGenerated={setGeneratedCharts}
                    externalSuggestions={analysisResults.charts}
                    externalError={chartGenerationError}
                    disabled={isAnalyzingAll}
                  />
                </FullscreenCard>

                {generatedCharts && generatedCharts.length > 0 && (
                  <FullscreenCard className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                    <ChartDisplay
                      data={csvData}
                      charts={generatedCharts}
                      onRegenerate={handleRegenerateChart}
                    />
                  </FullscreenCard>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </ClientOnly>
  );
}
