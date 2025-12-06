import Cookies from "js-cookie";
import { DEFAULT_MODEL, getBrowserLanguage, type ModelId, type LanguageCode } from "./ai-models";

export interface StoredSettings {
  apiKey: string;
  model: ModelId;
  language: LanguageCode;
  customEndpoint?: string;
  customModel?: string;
}

export interface CSVStoredSettings {
  delimiter: string;
  hasHeader: boolean;
  encoding: string;
  skipEmptyLines: boolean;
}

const API_KEY_COOKIE = "csv-ai-api-key";
const MODEL_COOKIE = "csv-ai-model";
const LANGUAGE_COOKIE = "csv-ai-language";
const CUSTOM_ENDPOINT_COOKIE = "csv-ai-custom-endpoint";
const CUSTOM_MODEL_COOKIE = "csv-ai-custom-model";
const CSV_SETTINGS_KEY = "csv-ai-analyzer-csv-settings";

// Cookie options for security
const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 365, // 1 year
  secure: true, // Only sent over HTTPS
  sameSite: "strict", // Prevent CSRF
};

export const saveApiSettings = (settings: StoredSettings): void => {
  if (typeof window !== "undefined") {
    Cookies.set(API_KEY_COOKIE, settings.apiKey, COOKIE_OPTIONS);
    Cookies.set(MODEL_COOKIE, settings.model, COOKIE_OPTIONS);
    Cookies.set(LANGUAGE_COOKIE, settings.language, COOKIE_OPTIONS);
    if (settings.customEndpoint) {
      Cookies.set(CUSTOM_ENDPOINT_COOKIE, settings.customEndpoint, COOKIE_OPTIONS);
    } else {
      Cookies.remove(CUSTOM_ENDPOINT_COOKIE);
    }
    if (settings.customModel) {
      Cookies.set(CUSTOM_MODEL_COOKIE, settings.customModel, COOKIE_OPTIONS);
    } else {
      Cookies.remove(CUSTOM_MODEL_COOKIE);
    }
  }
};

export const loadApiSettings = (): StoredSettings | null => {
  if (typeof window !== "undefined") {
    const apiKey = Cookies.get(API_KEY_COOKIE);
    // Use nullish-coalescing to avoid treating empty strings as missing values
    const model = Cookies.get(MODEL_COOKIE) ?? DEFAULT_MODEL;
    const language = (Cookies.get(LANGUAGE_COOKIE) as LanguageCode) ?? getBrowserLanguage();
    const customEndpoint = Cookies.get(CUSTOM_ENDPOINT_COOKIE);
    const customModel = Cookies.get(CUSTOM_MODEL_COOKIE);

    if (apiKey) {
      return { apiKey, model, language, customEndpoint, customModel };
    }
  }
  return null;
};

export const clearApiSettings = (): void => {
  if (typeof window !== "undefined") {
    Cookies.remove(API_KEY_COOKIE);
    Cookies.remove(MODEL_COOKIE);
    Cookies.remove(LANGUAGE_COOKIE);
    Cookies.remove(CUSTOM_ENDPOINT_COOKIE);
    Cookies.remove(CUSTOM_MODEL_COOKIE);
  }
};

export const saveCsvSettings = (settings: CSVStoredSettings): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(CSV_SETTINGS_KEY, JSON.stringify(settings));
  }
};

export const loadCsvSettings = (): CSVStoredSettings | null => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(CSV_SETTINGS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as CSVStoredSettings;
      } catch {
        return null;
      }
    }
  }
  return null;
};
