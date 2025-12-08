export type ProviderId = string;

// Allow arbitrary model IDs (including vendor-specific names) — keep typed known IDs but accept custom strings
export type ModelId = string;

// Default provider when nothing is selected yet (no default model - user must select one)
export const DEFAULT_PROVIDER_ID: ProviderId = "openai";
export const DEFAULT_MODEL: ModelId = ""; // Empty - user must select a model

// Per-provider default models (prefer the canonical model id from the live catalog)
export const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-haiku-4-5",
  mistral: "mistral-small-latest",
  openai: "gpt-5-mini",
  xai: "grok-4-1-fast",
};

// Supported languages for LLM output
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

// Get browser language or default to English
export function getBrowserLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";

  const browserLang = navigator.language.split("-")[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
  return supported ? supported.code : "en";
}
