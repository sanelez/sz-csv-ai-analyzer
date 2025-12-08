"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Key, X, Eye, EyeOff, Check, Globe, Server, AlertTriangle } from "lucide-react";
import { loadApiSettings, saveApiSettings, type StoredSettings } from "~/lib/storage";
import { DEFAULT_MODEL, DEFAULT_PROVIDER_ID, DEFAULT_MODEL_BY_PROVIDER, SUPPORTED_LANGUAGES, getBrowserLanguage, type ModelId, type LanguageCode, type ProviderId } from "~/lib/ai-models";

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
  const [model, setModel] = useState<ModelId>(currentSettings?.model ?? DEFAULT_MODEL);
  const [providerId, setProviderId] = useState<ProviderId>(currentSettings?.providerId ?? DEFAULT_PROVIDER_ID);
  const [language, setLanguage] = useState<LanguageCode>(currentSettings?.language ?? getBrowserLanguage());
  const [customEndpoint, setCustomEndpoint] = useState(currentSettings?.customEndpoint ?? "");
  const [customModel, setCustomModel] = useState(currentSettings?.customModel ?? "");
  const [showKey, setShowKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(!!currentSettings?.customEndpoint);
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
      fetch("/models.json")
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
    if (!catalog) return [];
    return Object.values(catalog).map((p) => ({
      id: p.id,
      name: p.name,
    }));
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
        m.id.toLowerCase().includes(search)
    );
  }, [selectedProvider, searchTerm]);

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
        className="fixed inset-0 z-101 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 border-2 border-violet-500/60 shadow-[0_0_60px_rgba(139,92,246,0.3)] animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/40">
                  <Key className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white">API Configuration</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={useCustomEndpoint ? (!customEndpoint.trim() || !customModel.trim()) : (!apiKey.trim() || !model)}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Current Model Display */}
            <div className="mt-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              {currentSettings?.model ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current model</p>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-sm font-semibold text-white truncate">
                      {(() => {
                        const currentModel = catalog 
                          ? Object.values(catalog)
                              .flatMap((provider: ProviderInfo) => Object.values(provider.models))
                              .find((m: ModelInfo) => m.id === currentSettings.model)
                          : null;
                        return currentModel?.name ?? currentSettings.model;
                      })()}
                    </p>
                  </div>
                  {currentSettings.providerName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Provider: {currentSettings.providerName}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-400">No model selected - please configure below</p>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Custom Endpoint Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useCustomEndpoint}
                    onChange={(e) => setUseCustomEndpoint(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-200">Use Custom Endpoint</span>
                </div>
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Connect to OpenAI-compatible APIs (Ollama, LM Studio, vLLM, etc.)
              </p>
            </div>

            {/* Custom Endpoint Fields */}
            {useCustomEndpoint && (
              <div className="space-y-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Example: http://localhost:11434/v1 for Ollama
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="llama3.2, mistral, codellama, etc."
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    The model name as configured in your server
                  </p>
                </div>
              </div>
            )}

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                {useCustomEndpoint ? "API Key (optional)" : "Provider API Key"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={useCustomEndpoint ? "Leave empty if not required" : "sk-..."}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
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
                <label className="block text-sm font-semibold text-gray-200 mb-1">Provider</label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                >
                  {providerSelectOptions.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name ?? provider.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Pick the provider to populate models.</p>
              </div>
            )}

            {/* Model Selection - Only show when not using custom endpoint */}
            {!useCustomEndpoint && (
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">
                  Model
                </label>
                
                {/* Recommended Model Badge - Above search */}
                {selectedProvider && (() => {
                  const recommendedModelId = DEFAULT_MODEL_BY_PROVIDER[selectedProvider.id];
                  
                  const recommendedModel = recommendedModelId 
                    ? modelOptions.find((m: ModelInfo) => m.id.includes(recommendedModelId.split("/").pop() ?? "") || m.id === recommendedModelId)
                    : null;

                  return recommendedModel ? (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                          Recommended
                        </span>
                      </div>
                      <button
                        key={recommendedModel.id}
                        type="button"
                        onClick={() => setModel(recommendedModel.id)}
                        className={`
                          w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                          ${model === recommendedModel.id
                            ? "border-emerald-500 bg-emerald-500/20"
                            : "border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-500 hover:bg-emerald-500/15"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white">{recommendedModel.name}</span>
                            <p className="text-sm text-gray-400 mt-0.5">{recommendedModel.description}</p>
                            {recommendedModel.providerName && (
                              <p className="text-xs text-gray-500 mt-1">{recommendedModel.providerName}</p>
                            )}
                          </div>
                          {model === recommendedModel.id && (
                            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      </button>
                    </div>
                  ) : null;
                })()}

                {/* Search field to filter the models list */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search models (name or id)"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {modelOptions.map((m: ModelInfo) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      className={`
                        w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                        ${model === m.id
                          ? "border-violet-500 bg-violet-500/20"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white">{m.name}</span>
                          <p className="text-sm text-gray-400 mt-0.5">{m.description}</p>
                          {m.providerName && (
                            <p className="text-xs text-gray-500 mt-1">{m.providerName}</p>
                          )}
                        </div>
                        {model === m.id && (
                          <Check className="w-5 h-5 text-violet-400" />
                        )}
                      </div>
                      <div className="mt-2 flex gap-2 text-[11px] text-gray-400">
                        {m.tool_call && <span className="px-2 py-0.5 rounded bg-white/10">Tools</span>}
                        {m.reasoning && <span className="px-2 py-0.5 rounded bg-white/10">Reasoning</span>}
                      </div>
                    </button>
                  ))}
                  {modelOptions.length === 0 && (
                    <p className="text-sm text-gray-500">No models available for this provider. Please wait for the catalog to load.</p>
                  )}
                  {modelOptions.length > 0 && !model && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-2">
                      <p className="text-sm text-amber-400">Please select a model to continue</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Response Language
                </div>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 font-medium hover:bg-gray-750 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={useCustomEndpoint ? (!customEndpoint.trim() || !customModel.trim()) : (!apiKey.trim() || !model)}
                className="flex-1 px-4 py-3 rounded-xl bg-linear-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
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

  const hasKey = currentSettings?.apiKey && currentSettings.apiKey.trim() !== "";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium
          transition-all duration-200 shadow-lg
          ${hasKey
            ? "bg-emerald-600 border-2 border-emerald-500 text-white hover:bg-emerald-500 shadow-emerald-500/25"
            : "bg-violet-600 border-2 border-violet-500 text-white hover:bg-violet-500 shadow-violet-500/25"
          }
        `}
      >
        <Key className="w-4 h-4" />
        <span className="text-sm">
          {hasKey ? "API Configured ✓" : "Configure API"}
        </span>
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
