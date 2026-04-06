import Cookies from "js-cookie";
import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER_ID,
  getBrowserLanguage,
  type ModelId,
  type ProviderId,
  type LanguageCode,
} from "./ai-models";

export interface StoredSettings {
  apiKey: string;
  model: ModelId;
  providerId?: ProviderId;
  providerName?: string;
  providerNpm?: string;
  providerApi?: string;
  language: LanguageCode;
  customEndpoint?: string;
  customModel?: string;
}

const API_KEY_COOKIE = "csv-ai-api-key";
const MODEL_COOKIE = "csv-ai-model";
const LANGUAGE_COOKIE = "csv-ai-language";
const PROVIDER_COOKIE = "csv-ai-provider";
const PROVIDER_NAME_COOKIE = "csv-ai-provider-name";
const PROVIDER_NPM_COOKIE = "csv-ai-provider-npm";
const PROVIDER_API_COOKIE = "csv-ai-provider-api";
const CUSTOM_ENDPOINT_COOKIE = "csv-ai-custom-endpoint";
const CUSTOM_MODEL_COOKIE = "csv-ai-custom-model";
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
    Cookies.set(
      PROVIDER_COOKIE,
      settings.providerId ?? DEFAULT_PROVIDER_ID,
      COOKIE_OPTIONS,
    );
    if (settings.providerName) {
      Cookies.set(PROVIDER_NAME_COOKIE, settings.providerName, COOKIE_OPTIONS);
    } else {
      Cookies.remove(PROVIDER_NAME_COOKIE);
    }
    if (settings.providerNpm) {
      Cookies.set(PROVIDER_NPM_COOKIE, settings.providerNpm, COOKIE_OPTIONS);
    } else {
      Cookies.remove(PROVIDER_NPM_COOKIE);
    }
    if (settings.providerApi) {
      Cookies.set(PROVIDER_API_COOKIE, settings.providerApi, COOKIE_OPTIONS);
    } else {
      Cookies.remove(PROVIDER_API_COOKIE);
    }
    if (settings.customEndpoint) {
      Cookies.set(
        CUSTOM_ENDPOINT_COOKIE,
        settings.customEndpoint,
        COOKIE_OPTIONS,
      );
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
    const providerId = Cookies.get(PROVIDER_COOKIE) ?? DEFAULT_PROVIDER_ID;
    const providerName = Cookies.get(PROVIDER_NAME_COOKIE);
    const providerNpm = Cookies.get(PROVIDER_NPM_COOKIE);
    const providerApi = Cookies.get(PROVIDER_API_COOKIE);
    const language = (Cookies.get(LANGUAGE_COOKIE) ??
      getBrowserLanguage()) as LanguageCode;
    const customEndpoint = Cookies.get(CUSTOM_ENDPOINT_COOKIE);
    const customModel = Cookies.get(CUSTOM_MODEL_COOKIE);

    if (apiKey || customEndpoint) {
      return {
        apiKey: apiKey ?? "",
        model,
        providerId,
        providerName: providerName ?? undefined,
        providerNpm: providerNpm ?? undefined,
        providerApi: providerApi ?? undefined,
        language,
        customEndpoint,
        customModel,
      };
    }
  }
  return null;
};

export const clearApiSettings = (): void => {
  if (typeof window !== "undefined") {
    Cookies.remove(API_KEY_COOKIE);
    Cookies.remove(MODEL_COOKIE);
    Cookies.remove(LANGUAGE_COOKIE);
    Cookies.remove(PROVIDER_COOKIE);
    Cookies.remove(PROVIDER_NAME_COOKIE);
    Cookies.remove(PROVIDER_NPM_COOKIE);
    Cookies.remove(PROVIDER_API_COOKIE);
    Cookies.remove(CUSTOM_ENDPOINT_COOKIE);
    Cookies.remove(CUSTOM_MODEL_COOKIE);
  }
};
