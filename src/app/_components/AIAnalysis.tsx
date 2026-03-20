"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Brain,
  Loader2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  type CSVData,
  generateDataSummary as generateCSVSummary,
} from "~/lib/csv-parser";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  generateDataSummary,
  detectAnomalies,
  streamCustomAnalysis,
  type DataSummaryResult,
  type AnomalyResult,
  type AIServiceConfig,
} from "~/lib/ai-service";
import type { StoredSettings } from "~/lib/storage";
import { useChatStore } from "~/lib/chat-store";

interface AIAnalysisProps {
  data: CSVData;
  apiSettings: StoredSettings | null;
  externalSummary?: DataSummaryResult | null;
  externalAnomalies?: AnomalyResult[] | null;
  externalSummaryError?: string | null;
  externalAnomaliesError?: string | null;
  disabled?: boolean;
}

const SEVERITY_COLORS = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const SEVERITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function AIAnalysis({
  data,
  apiSettings,
  externalSummary,
  externalAnomalies,
  externalSummaryError,
  externalAnomaliesError,
  disabled = false,
}: AIAnalysisProps) {
  // Independent loading states for each analysis type
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [anomaliesError, setAnomaliesError] = useState<string | null>(null);

  // Summary state
  const [summaryResult, setSummaryResult] = useState<DataSummaryResult | null>(
    null,
  );

  // Anomalies state
  const [anomaliesResult, setAnomaliesResult] = useState<
    AnomalyResult[] | null
  >(null);

  // Custom analysis state and active tab - using global store to persist across fullscreen toggle
  const {
    history: customHistory,
    streamingResponse,
    currentPrompt: customPrompt,
    activeTab,
    isLoading: isLoadingCustom,
    pendingPrompt,
    addMessage,
    setStreaming,
    appendStreaming,
    setPrompt: setCustomPrompt,
    setActiveTab,
    setLoading: setLoadingCustom,
  } = useChatStore();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    insights: true,
    quality: true,
  });

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [customHistory, streamingResponse, expandedSections.custom]);

  // Sync with external results
  useEffect(() => {
    if (externalSummary) {
      setSummaryResult(externalSummary);
    }
  }, [externalSummary]);

  useEffect(() => {
    if (externalAnomalies) {
      setAnomaliesResult(externalAnomalies);
    }
  }, [externalAnomalies]);

  // Compute effective errors: use external error (from page.tsx "Run All") if available,
  // otherwise fall back to local error (from individual button clicks)
  const effectiveSummaryError = externalSummaryError || summaryError;
  const effectiveAnomaliesError = externalAnomaliesError || anomaliesError;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getConfig = (): AIServiceConfig | null => {
    // Allow custom endpoint without API key
    const hasValidConfig = apiSettings?.customEndpoint
      ? !!apiSettings.customModel
      : !!apiSettings?.apiKey;
    if (!hasValidConfig) return null;
    return {
      apiKey: apiSettings!.apiKey,
      model: apiSettings!.model,
      providerId: apiSettings!.providerId,
      providerNpm: apiSettings!.providerNpm,
      providerApi: apiSettings!.providerApi,
      language: apiSettings!.language,
      customEndpoint: apiSettings!.customEndpoint,
      customModel: apiSettings!.customModel,
    };
  };

  const handleGenerateSummary = async () => {
    const config = getConfig();
    if (!config) {
      setSummaryError("Please configure your API key");
      toast.error("Configuration Required", {
        description: "Please configure your API key",
      });
      return;
    }

    setIsLoadingSummary(true);
    setSummaryError(null);
    toast.loading("Generating Summary", {
      description: "Analyzing your data...",
      id: "summary-toast",
    });

    try {
      const csvSummary = generateCSVSummary(data);
      const result = await generateDataSummary(config, csvSummary);
      setSummaryResult(result);
      setSummaryError(null);
      toast.success("Summary Generated", {
        description: "Data summary is ready!",
        id: "summary-toast",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unable to analyze data. Please try again.";
      setSummaryError(errorMessage);
      console.error("Data summary failed:", err);
      toast.error("Summary Failed", {
        description: errorMessage,
        id: "summary-toast",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleDetectAnomalies = async () => {
    const config = getConfig();
    if (!config) {
      setAnomaliesError("Please configure your API key");
      toast.error("Configuration Required", {
        description: "Please configure your API key",
      });
      return;
    }

    setIsLoadingAnomalies(true);
    setAnomaliesError(null);
    toast.loading("Detecting Anomalies", {
      description: "Scanning your data for anomalies...",
      id: "anomalies-toast",
    });

    try {
      const csvSummary = generateCSVSummary(data);
      // Get sample rows as CSV string (first 50 rows)
      const headers = data.headers.join(",");
      const rows = data.rows
        .slice(0, 50)
        .map((row) => row.join(","))
        .join("\n");
      const sampleCSV = `${headers}\n${rows}`;

      const result = await detectAnomalies(config, csvSummary, sampleCSV);
      setAnomaliesResult(result);
      setAnomaliesError(null);
      toast.success("Anomalies Detected", {
        description: `Found ${result.length} potential anomal${result.length === 1 ? "y" : "ies"}`,
        id: "anomalies-toast",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unable to detect anomalies. Please try again.";
      setAnomaliesError(errorMessage);
      console.error("Anomaly detection failed:", err);
      toast.error("Detection Failed", {
        description: errorMessage,
        id: "anomalies-toast",
      });
    } finally {
      setIsLoadingAnomalies(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (!customPrompt.trim()) return;

    const config = getConfig();
    if (!config) {
      setError("Please configure your API key");
      toast.error("Configuration Required", {
        description: "Please configure your API key",
      });
      return;
    }

    const currentPrompt = customPrompt;
    setLoadingCustom(true, currentPrompt);
    setStreaming("");
    setCustomPrompt("");
    toast.loading("Processing Query", {
      description: "AI is analyzing your request...",
      id: "custom-query-toast",
    });

    try {
      const csvSummary = generateCSVSummary(data);

      await streamCustomAnalysis(
        config,
        currentPrompt,
        csvSummary,
        // onChunk - called for each text chunk
        (chunk) => {
          appendStreaming(chunk);
        },
        // onComplete - called when streaming is done
        (fullText) => {
          addMessage({ prompt: currentPrompt, response: fullText });
          setStreaming("");
          setLoadingCustom(false);
          toast.success("Query Complete", {
            description: "AI has finished analyzing your request",
            id: "custom-query-toast",
          });
        },
        customHistory, // Pass current history
      );
    } catch (err) {
      let errorMessage = "Unable to analyze. Please try again.";
      if (err instanceof Error && err.message && err.message.trim() !== "") {
        errorMessage = err.message;
      } else if (typeof err === "string" && err.trim() !== "") {
        errorMessage = err;
      }

      const errorResponse = `[ERROR] ${errorMessage}`;
      // Add error directly to history and stop loading
      addMessage({
        prompt: currentPrompt,
        response: errorResponse,
      });
      setStreaming("");
      setLoadingCustom(false);
      toast.error("Query Failed", {
        description: errorMessage,
        id: "custom-query-toast",
      });
    }
  };

  const tabs = [
    { id: "summary" as const, label: "Summary", icon: FileText },
    { id: "anomalies" as const, label: "Anomalies", icon: AlertTriangle },
    { id: "custom" as const, label: "Custom Query", icon: MessageSquare },
  ];

  return (
    <div className="glass-card animate-fade-in p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/20 to-teal-500/20 p-3">
          <Brain className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">AI Analysis</h3>
          <p className="text-sm text-gray-400">
            Get intelligent insights about your data
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
              activeTab === tab.id
                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            } `}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
            {/* Show an error badge on the tab if the corresponding analysis has an error */}
            {tab.id === "summary" && effectiveSummaryError && (
              <span
                className="ml-1 inline-flex h-2 w-2 rounded-full bg-red-500"
                aria-label="Error"
              />
            )}
            {tab.id === "anomalies" && effectiveAnomaliesError && (
              <span
                className="ml-1 inline-flex h-2 w-2 rounded-full bg-red-500"
                aria-label="Error"
              />
            )}
          </button>
        ))}
      </div>

      {/* Global error for config issues */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* No API Key Warning */}
      {!apiSettings?.apiKey && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">
            Configure your API key to use AI analysis
          </p>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {effectiveSummaryError && (
              <div className="animate-fade-in rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-medium text-red-400">
                      Error generating summary
                    </p>
                    <p className="text-sm text-red-300/80">
                      {effectiveSummaryError}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!summaryResult ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-gray-400">
                  AI will analyze your data and generate a complete summary
                </p>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={
                    disabled || isLoadingSummary || !apiSettings?.apiKey
                  }
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoadingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Generate Summary
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-white">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Dataset Description
                  </h4>
                  <MarkdownRenderer content={summaryResult.summary} />
                </div>

                {/* Key Insights */}
                {summaryResult.keyInsights &&
                  summaryResult.keyInsights.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <button
                        type="button"
                        onClick={() => toggleSection("insights")}
                        className="mb-2 flex w-full items-center justify-between"
                      >
                        <h4 className="flex items-center gap-2 font-medium text-white">
                          <Lightbulb className="h-4 w-4 text-yellow-400" />
                          Key Insights ({summaryResult.keyInsights.length})
                        </h4>
                        {expandedSections.insights ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      {expandedSections.insights && (
                        <ul className="space-y-2">
                          {summaryResult.keyInsights.map((insight, i) => (
                            <li
                              key={`insight-${i}`}
                              className="flex items-start gap-2 text-gray-300"
                            >
                              <span className="mt-1 text-emerald-400">•</span>
                              <MarkdownRenderer content={insight} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                {/* Data Quality */}
                {summaryResult.dataQuality && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <button
                      type="button"
                      onClick={() => toggleSection("quality")}
                      className="mb-2 flex w-full items-center justify-between"
                    >
                      <h4 className="flex items-center gap-2 font-medium text-white">
                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                        Data Quality
                      </h4>
                      {expandedSections.quality ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {expandedSections.quality && (
                      <MarkdownRenderer content={summaryResult.dataQuality} />
                    )}
                  </div>
                )}

                {/* Regenerate Button */}
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={disabled || isLoadingSummary}
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  {isLoadingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Regenerate Analysis
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Anomalies Tab */}
        {activeTab === "anomalies" && (
          <div className="space-y-4">
            {effectiveAnomaliesError && (
              <div className="animate-fade-in rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-medium text-red-400">
                      Error detecting anomalies
                    </p>
                    <p className="text-sm text-red-300/80">
                      {effectiveAnomaliesError}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!anomaliesResult ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-gray-400">
                  AI will scan your data to detect anomalies
                </p>
                <button
                  type="button"
                  onClick={handleDetectAnomalies}
                  disabled={
                    disabled || isLoadingAnomalies || !apiSettings?.apiKey
                  }
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoadingAnomalies ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Detect Anomalies
                    </>
                  )}
                </button>
              </div>
            ) : anomaliesResult.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-4 inline-block rounded-full bg-green-500/20 p-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <p className="mb-2 text-gray-300">No anomalies detected</p>
                <p className="text-sm text-gray-500">
                  Your data appears to be valid and consistent
                </p>
                <button
                  type="button"
                  onClick={handleDetectAnomalies}
                  disabled={disabled || isLoadingAnomalies}
                  className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm"
                >
                  {isLoadingAnomalies ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Run Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">
                    <span className="font-medium text-white">
                      {anomaliesResult.length}
                    </span>{" "}
                    anomal{anomaliesResult.length > 1 ? "ies" : "y"} detected
                  </p>
                  <button
                    type="button"
                    onClick={handleDetectAnomalies}
                    disabled={disabled || isLoadingAnomalies}
                    className="btn-secondary inline-flex items-center gap-2 text-sm"
                  >
                    {isLoadingAnomalies ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Run Again
                  </button>
                </div>

                <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
                  {anomaliesResult.map((anomaly, i) => (
                    <div
                      key={`anomaly-${i}`}
                      className={`rounded-xl border p-4 ${SEVERITY_COLORS[anomaly.severity]}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                              Row {anomaly.row}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                              {anomaly.column}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${SEVERITY_COLORS[anomaly.severity]}`}
                            >
                              {SEVERITY_LABELS[anomaly.severity]}
                            </span>
                          </div>
                          <p className="text-sm">{anomaly.issue}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Value:{" "}
                            <code className="rounded bg-white/10 px-1">
                              {anomaly.value}
                            </code>
                          </p>
                        </div>
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Analysis Tab */}
        {activeTab === "custom" && (
          <div className="space-y-4">
            {/* History */}
            {(customHistory.length > 0 || isLoadingCustom) && (
              <div
                ref={chatContainerRef}
                className="mb-4 max-h-[400px] space-y-4 overflow-y-auto scroll-smooth pr-2"
              >
                {customHistory.map((item, i) => {
                  const isError = item.response.startsWith("[ERROR]");
                  return (
                    <div key={`history-${i}`} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-violet-500/20 p-2">
                          <MessageSquare className="h-4 w-4 text-violet-400" />
                        </div>
                        <div className="flex-1 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
                          <p className="text-sm text-gray-300">{item.prompt}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-lg p-2 ${isError ? "bg-red-500/20" : "bg-emerald-500/20"}`}
                        >
                          {isError ? (
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          ) : (
                            <Brain className="h-4 w-4 text-emerald-400" />
                          )}
                        </div>
                        <div
                          className={`flex-1 rounded-xl p-3 ${
                            isError
                              ? "border border-red-500/30 bg-red-500/10"
                              : "border border-white/10 bg-white/5"
                          }`}
                        >
                          {isError ? (
                            <p className="text-sm whitespace-pre-wrap text-red-300">
                              {item.response}
                            </p>
                          ) : (
                            <MarkdownRenderer
                              content={item.response}
                              className="text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Streaming response - shown while generating */}
                {isLoadingCustom && (
                  <div className="space-y-2">
                    {/* Show the pending prompt */}
                    {pendingPrompt && (
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-violet-500/20 p-2">
                          <MessageSquare className="h-4 w-4 text-violet-400" />
                        </div>
                        <div className="flex-1 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
                          <p className="text-sm text-gray-300">
                            {pendingPrompt}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Show the streaming response */}
                    <div className="flex items-start gap-3">
                      {streamingResponse.startsWith("[ERROR]") ? (
                        <div className="rounded-lg bg-red-500/20 p-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                      ) : (
                        <div className="rounded-lg bg-emerald-500/20 p-2">
                          <Brain className="h-4 w-4 animate-pulse text-emerald-400" />
                        </div>
                      )}
                      <div
                        className={`flex-1 rounded-xl p-3 ${
                          streamingResponse.startsWith("[ERROR]")
                            ? "border border-red-500/30 bg-red-500/10"
                            : "border border-emerald-500/30 bg-white/5"
                        }`}
                      >
                        {streamingResponse.startsWith("[ERROR]") ? (
                          <p className="text-sm whitespace-pre-wrap text-red-300">
                            {streamingResponse}
                          </p>
                        ) : streamingResponse ? (
                          <MarkdownRenderer
                            content={streamingResponse}
                            className="text-sm"
                            isStreaming
                          />
                        ) : (
                          <p className="text-sm text-gray-300">Analyzing...</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleCustomAnalysis();
                  }
                }}
                placeholder="Ask a question about your data..."
                className="input-field flex-1"
                disabled={disabled || isLoadingCustom || !apiSettings?.apiKey}
              />
              <button
                type="button"
                onClick={handleCustomAnalysis}
                disabled={
                  disabled ||
                  isLoadingCustom ||
                  !customPrompt.trim() ||
                  !apiSettings?.apiKey
                }
                className="btn-primary px-4 disabled:opacity-50"
              >
                {isLoadingCustom ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {customHistory.length === 0 && !isLoadingCustom && (
              <p className="py-4 text-center text-sm text-gray-500">
                Ask any question about your data. For example:
                <br />
                <span className="text-gray-400">
                  &quot;What is the sales trend?&quot;
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
