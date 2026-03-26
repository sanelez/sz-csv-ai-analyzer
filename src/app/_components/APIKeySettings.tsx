"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "~/lib/use-focus-trap";
import { toast } from "sonner";
import {
  Key,
  X,
  Eye,
  EyeOff,
  Check,
  Globe,
  Server,
  AlertTriangle,
} from "lucide-react";
import {
  loadApiSettings,
  saveApiSettings,
  type StoredSettings,
} from "~/lib/storage";
import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER_ID,
  DEFAULT_MODEL_BY_PROVIDER,
  SUPPORTED_LANGUAGES,
  getBrowserLanguage,
  type ModelId,
  type LanguageCode,
  type ProviderId,
} from "~/lib/ai-models";

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  providerName?: string;
  tool_call?: boolean;
  reasoning?: boolean;
}

interface ProviderInfo {
  id: string;
  name: string;
  npm?: string;
  api?: string;
  models: Record<string, ModelInfo>;
}

type ModelCatalog = Record<string, ProviderInfo>;

interface APIKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: StoredSettings) => void;
  currentSettings: StoredSettings | null;
}

export function APIKeySettings({
  isOpen,
  onClose,
  onSettingsChange,
  currentSettings,
}: APIKeySettingsProps) {
  const [apiKey, setApiKey] = useState(currentSettings?.apiKey ?? "");
  const [model, setModel] = useState<ModelId>(
    currentSettings?.model ?? DEFAULT_MODEL,
  );
  const [providerId, setProviderId] = useState<ProviderId>(
    currentSettings?.providerId ?? DEFAULT_PROVIDER_ID,
  );
  const [language, setLanguage] = useState<LanguageCode>(
    currentSettings?.language ?? getBrowserLanguage(),
  );
  const [customEndpoint, setCustomEndpoint] = useState(
    currentSettings?.customEndpoint ?? "",
  );
  const [customModel, setCustomModel] = useState(
    currentSettings?.customModel ?? "",
  );
  const [showKey, setShowKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(
    !!currentSettings?.customEndpoint,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (currentSettings) {
      setApiKey(currentSettings.apiKey);
      setModel(currentSettings.model ?? DEFAULT_MODEL);
      setProviderId(currentSettings.providerId ?? DEFAULT_PROVIDER_ID);
      setLanguage(currentSettings.language ?? getBrowserLanguage());
      setCustomEndpoint(currentSettings.customEndpoint ?? "");
      setCustomModel(currentSettings.customModel ?? "");
      setUseCustomEndpoint(!!currentSettings.customEndpoint);
    }
  }, [currentSettings]);

  // Load catalog
  useEffect(() => {
    if (!catalog && !isLoadingCatalog) {
      setIsLoadingCatalog(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      fetch(`${basePath}/models.json`)
        .then((res) => res.json())
        .then((data: ModelCatalog) => {
          setCatalog(data);
          setIsLoadingCatalog(false);
        })
        .catch((err) => {
          console.error("Failed to load models catalog:", err);
          setIsLoadingCatalog(false);
        });
    }
  }, [catalog, isLoadingCatalog]);

  const selectedProvider = useMemo(() => {
    return catalog?.[providerId] ?? null;
  }, [catalog, providerId]);

  const providerSelectOptions = useMemo(() => {
    if (!catalog) return { recommended: [], others: [] };
    // Recommended providers to surface first and mark in the UI
    const recommendedIds = ["google", "anthropic", "mistral", "openai"];

    // Build an array with recommended providers first (in that order) then the rest
    const allProviders = Object.values(catalog);

    const recommendedProviders = recommendedIds
      .map((id) => allProviders.find((p) => p.id === id))
      .filter(Boolean) as ProviderInfo[];

    const otherProviders = allProviders
      .filter((p) => !recommendedIds.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      recommended: recommendedProviders.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      others: otherProviders.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    };
  }, [catalog]);

  const modelOptions = useMemo(() => {
    if (!selectedProvider) return [];
    const models = Object.values(selectedProvider.models).map((m) => ({
      ...m,
      providerName: selectedProvider.name,
    }));

    if (!searchTerm.trim()) return models;

    const search = searchTerm.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.id.toLowerCase().includes(search),
    );
  }, [selectedProvider, searchTerm]);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen && mounted);

  if (!isOpen || !mounted) return null;

  const providerMeta = selectedProvider
    ? {
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        providerNpm: selectedProvider.npm ?? "",
        providerApi: selectedProvider.api ?? "",
      }
    : {
        providerId: DEFAULT_PROVIDER_ID,
        providerName: "OpenAI",
        providerNpm: "@ai-sdk/openai",
        providerApi: "https://api.openai.com/v1",
      };

  const handleSave = () => {
    if (useCustomEndpoint && customEndpoint.trim()) {
      try {
        new URL(customEndpoint.trim());
      } catch {
        toast.error("Invalid endpoint URL", {
          description:
            "Please enter a valid URL (e.g., http://localhost:11434/v1).",
        });
        return;
      }
    }

    const settings: StoredSettings = {
      apiKey,
      model,
      language,
      providerId: providerMeta.providerId,
      providerName: providerMeta.providerName,
      providerNpm: providerMeta.providerNpm,
      providerApi: providerMeta.providerApi,
      customEndpoint: useCustomEndpoint ? customEndpoint : undefined,
      customModel: useCustomEndpoint ? customModel : undefined,
    };
    saveApiSettings(settings);
    onSettingsChange(settings);
    toast.success("Settings Saved", {
      description: `Using ${providerMeta.providerName} with ${model.split("/").pop() ?? model}`,
    });
    onClose();
  };

  const modalContent = (
    <>
      {/* SOLID Backdrop */}
      <div
        className="fixed inset-0 z-100 bg-gray-950/90 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="pointer-events-none fixed inset-0 z-101 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={modalRef}
          className="animate-scale-in pointer-events-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-violet-500/60 bg-gray-900 shadow-[0_0_60px_rgba(139,92,246,0.3)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-violet-500/40 bg-violet-500/20 p-2.5">
                  <Key className="h-5 w-5 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  API Configuration
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    useCustomEndpoint
                      ? !customEndpoint.trim() || !customModel.trim()
                      : !apiKey.trim() || !model
                  }
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Current Model Display */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              {(currentSettings?.customEndpoint &&
                currentSettings?.customModel) ||
              currentSettings?.model ? (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Current model</p>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="truncate text-sm font-semibold text-white">
                      {(() => {
                        // If using custom endpoint, show custom model name
                        if (
                          currentSettings.customEndpoint &&
                          currentSettings.customModel
                        ) {
                          return currentSettings.customModel;
                        }
                        // Otherwise, try to find the model name from the catalog
                        const currentModel = catalog
                          ? Object.values(catalog)
                              .flatMap((provider: ProviderInfo) =>
                                Object.values(provider.models),
                              )
                              .find(
                                (m: ModelInfo) =>
                                  m.id === currentSettings.model,
                              )
                          : null;
                        return currentModel?.name ?? currentSettings.model;
                      })()}
                    </p>
                  </div>
                  {currentSettings.customEndpoint ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Endpoint: {currentSettings.customEndpoint}
                    </p>
                  ) : currentSettings.providerName ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Provider: {currentSettings.providerName}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-sm text-amber-400">
                    No model selected - please configure below
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Custom Endpoint Toggle */}
            <div>
              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useCustomEndpoint}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      // When switching to a custom endpoint, visually reset the API key
                      // (clear the field and hide the key preview) so the UI reflects
                      // that provider keys are optional for most custom endpoints.
                      setUseCustomEndpoint(checked);
                      if (checked) {
                        setApiKey("");
                        setShowKey(false);
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-violet-600 peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-200">
                    Use Custom Endpoint
                  </span>
                </div>
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Connect to OpenAI-compatible APIs (Ollama, LM Studio, vLLM,
                etc.)
              </p>
            </div>

            {/* Custom Endpoint Fields */}
            {useCustomEndpoint && (
              <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                <div>
                  <label
                    htmlFor="custom-endpoint-input"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    API Base URL
                  </label>
                  <input
                    id="custom-endpoint-input"
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Example: http://localhost:11434/v1 for Ollama
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="custom-model-input"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    Model Name
                  </label>
                  <input
                    id="custom-model-input"
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="llama3.2, mistral, codellama, etc."
                    className="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    The model name as configured in your server
                  </p>
                </div>
              </div>
            )}

            {/* API Key Input */}
            <div>
              <label
                htmlFor="api-key-input"
                className="mb-2 block text-sm font-semibold text-gray-200"
              >
                {useCustomEndpoint ? "API Key (optional)" : "Provider API Key"}
              </label>
              <div className="relative">
                <input
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    useCustomEndpoint ? "Leave empty if not required" : "sk-..."
                  }
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-white placeholder-gray-500 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 transition-colors hover:bg-white/10"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                🔒 Your key is stored securely in a cookie
              </p>
            </div>

            {/* catalog status & refresh UI removed — we use only the simple model selector for users */}

            {/* Provider Selection */}
            {!useCustomEndpoint && (
              <div className="space-y-2">
                <label
                  htmlFor="provider-select"
                  className="mb-1 block text-sm font-semibold text-gray-200"
                >
                  Provider
                </label>
                <select
                  id="provider-select"
                  value={providerId}
                  onChange={(e) => {
                    // Reset the apiKey field when switching providers
                    setProviderId(e.target.value);
                    setApiKey("");
                  }}
                  className="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-white transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                >
                  {providerSelectOptions.recommended.length > 0 && (
                    <optgroup label="Recommended">
                      {providerSelectOptions.recommended.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {providerSelectOptions.others.length > 0 && (
                    <optgroup label="Other Providers">
                      {providerSelectOptions.others.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-gray-500">
                  Pick the provider to populate models.
                </p>
                {providerSelectOptions.others.some(
                  (p) => p.id === providerId,
                ) && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                    <div className="text-sm text-amber-300">
                      <strong className="font-semibold">Important:</strong> This
                      provider must be OpenAI-compatible and support{" "}
                      <strong>client-side requests</strong> (CORS enabled).
                      Server-only APIs will not work in the browser.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Model Selection - Only show when not using custom endpoint */}
            {!useCustomEndpoint && (
              <div>
                <label className="mb-3 block text-sm font-semibold text-gray-200">
                  Model
                </label>

                {/* Recommended Model Badge - Above search */}
                {selectedProvider &&
                  (() => {
                    const recommendedModelId =
                      DEFAULT_MODEL_BY_PROVIDER[selectedProvider.id];

                    const recommendedModel = recommendedModelId
                      ? modelOptions.find(
                          (m: ModelInfo) => m.id === recommendedModelId,
                        )
                      : null;

                    return recommendedModel ? (
                      <div className="mb-3">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                          <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
                            Recommended
                          </span>
                        </div>
                        <button
                          key={recommendedModel.id}
                          type="button"
                          onClick={() => setModel(recommendedModel.id)}
                          className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                            model === recommendedModel.id
                              ? "border-emerald-500 bg-emerald-500/20"
                              : "border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-500 hover:bg-emerald-500/15"
                          } `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-gray-200">
                                {recommendedModel.name}
                              </span>
                              <p className="mt-0.5 text-sm text-gray-400">
                                {recommendedModel.description}
                              </p>
                              {recommendedModel.providerName && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {recommendedModel.providerName}
                                </p>
                              )}
                            </div>
                            {model === recommendedModel.id && (
                              <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                            )}
                          </div>
                        </button>
                      </div>
                    ) : null;
                  })()}

                {/* Search field to filter the models list */}
                <div className="mb-3">
                  <label htmlFor="model-search" className="sr-only">
                    Search models
                  </label>
                  <input
                    id="model-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search models (name or id)"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                  />
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {modelOptions.map((m: ModelInfo) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        model === m.id
                          ? "border-violet-500 bg-violet-500/20"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                      } `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-200">
                            {m.name}
                          </span>
                          <p className="mt-0.5 text-sm text-gray-400">
                            {m.description}
                          </p>
                          {m.providerName && (
                            <p className="mt-1 text-xs text-gray-500">
                              {m.providerName}
                            </p>
                          )}
                        </div>
                        {model === m.id && (
                          <Check className="h-5 w-5 text-violet-400" />
                        )}
                      </div>
                      <div className="mt-2 flex gap-2 text-[11px] text-gray-400">
                        {m.tool_call && (
                          <span className="rounded bg-white/10 px-2 py-0.5">
                            Tools
                          </span>
                        )}
                        {m.reasoning && (
                          <span className="rounded bg-white/10 px-2 py-0.5">
                            Reasoning
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {modelOptions.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No models available for this provider. Please wait for the
                      catalog to load.
                    </p>
                  )}
                  {modelOptions.length > 0 && !model && (
                    <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-sm text-amber-400">
                        Please select a model to continue
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Language Selection */}
            <div>
              <label
                htmlFor="language-select"
                className="mb-2 block text-sm font-semibold text-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Response Language
                </div>
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-white transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                AI responses will be generated in this language
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="hover:bg-gray-750 flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 font-medium text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  useCustomEndpoint
                    ? !customEndpoint.trim() || !customModel.trim()
                    : !apiKey.trim() || !model
                }
                className="flex-1 rounded-xl bg-linear-to-r from-violet-600 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

interface APIKeyButtonProps {
  onSettingsChange: (settings: StoredSettings) => void;
  currentSettings: StoredSettings | null;
}

export function APIKeyButton({
  onSettingsChange,
  currentSettings,
}: APIKeyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = loadApiSettings();
    if (stored) {
      onSettingsChange(stored);
    }
  }, [onSettingsChange]);

  const hasKey =
    currentSettings?.apiKey && currentSettings.apiKey.trim() !== "";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
          hasKey
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
        }`}
      >
        <Key className="h-4 w-4" />
        <span className="hidden sm:inline">{hasKey ? "API" : "API Key"}</span>
        {hasKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      </button>
      <APIKeySettings
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSettingsChange={onSettingsChange}
        currentSettings={currentSettings}
      />
    </>
  );
}
