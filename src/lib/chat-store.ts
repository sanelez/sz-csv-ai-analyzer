// Store to persist chat history and UI state across component remounts (e.g., fullscreen toggle)
// Uses immutable updates and proper React 18 external store pattern
// Chat history is also persisted to localStorage so it survives page reloads

import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import type { ChartSuggestion } from "./ai-service";

type ChatMessage = {
  prompt: string;
  response: string;
  chart?: ChartSuggestion;
};

type AnalysisTab = "summary" | "anomalies" | "custom";

type ChatStore = {
  history: ChatMessage[];
  streamingResponse: string;
  currentPrompt: string;
  activeTab: AnalysisTab;
  isLoading: boolean; // Track if custom query is loading
  pendingPrompt: string; // The prompt being processed
  version: number; // Force re-render on updates
};

// ============ localStorage persistence ============

const CHAT_HISTORY_KEY = "csv-ai-chat-history";

function loadHistoryFromStorage(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Corrupted data — ignore
  }
  return [];
}

function saveHistoryToStorage(history: ChatMessage[]) {
  if (typeof window === "undefined") return;
  // Defer write to avoid blocking the UI thread on large histories
  requestAnimationFrame(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  });
}

// Initial state
const initialState: ChatStore = {
  history: [],
  streamingResponse: "",
  currentPrompt: "",
  activeTab: "summary",
  isLoading: false,
  pendingPrompt: "",
  version: 0,
};

// Global state that persists across component mounts/unmounts
// Restore chat history from localStorage on first load
let store: ChatStore = {
  ...initialState,
  history: loadHistoryFromStorage(),
};

// Subscribers to notify on state changes
const subscribers = new Set<() => void>();

function notifySubscribers() {
  // Use microtask to batch updates and avoid race conditions
  queueMicrotask(() => {
    subscribers.forEach((callback) => {
      try {
        callback();
      } catch (e) {
        console.error("Chat store subscriber error:", e);
      }
    });
  });
}

// Immediate notification for critical updates (like streaming)
function notifySubscribersSync() {
  subscribers.forEach((callback) => {
    try {
      callback();
    } catch (e) {
      console.error("Chat store subscriber error:", e);
    }
  });
}

export function getChatStore(): ChatStore {
  return store;
}

function updateStore(
  updates: Partial<Omit<ChatStore, "version">>,
  sync = false,
) {
  store = {
    ...store,
    ...updates,
    version: store.version + 1,
  };
  if (sync) {
    notifySubscribersSync();
  } else {
    notifySubscribers();
  }
}

export function addChatMessage(message: ChatMessage) {
  const newHistory = [...store.history, message];
  updateStore({
    history: newHistory,
    streamingResponse: "",
    isLoading: false,
    pendingPrompt: "",
  });
  saveHistoryToStorage(newHistory);
}

export function setStreamingResponse(response: string) {
  updateStore({ streamingResponse: response }, true);
}

export function appendStreamingResponse(chunk: string) {
  updateStore({ streamingResponse: store.streamingResponse + chunk }, true);
}

export function setCurrentPrompt(prompt: string) {
  updateStore({ currentPrompt: prompt });
}

export function setLoadingState(isLoading: boolean, pendingPrompt = "") {
  updateStore(
    { isLoading, pendingPrompt: isLoading ? pendingPrompt : "" },
    true,
  );
}

export function updateChatMessageByIndex(
  index: number,
  updates: Partial<Pick<ChatMessage, "chart">>,
) {
  if (index < 0 || index >= store.history.length) return;
  const updated = [...store.history];
  updated[index] = { ...updated[index]!, ...updates };
  updateStore({ history: updated });
  saveHistoryToStorage(updated);
}

export function clearChatStore() {
  store = { ...initialState, version: store.version + 1 };
  notifySubscribers();
  saveHistoryToStorage([]);
}

export function setActiveTabInStore(tab: AnalysisTab) {
  if (store.activeTab !== tab) {
    updateStore({ activeTab: tab }, true);
  }
}

export function subscribeToChatStore(callback: () => void): () => void {
  subscribers.add(callback);
  // Immediately call to sync initial state
  callback();
  return () => {
    subscribers.delete(callback);
  };
}

// React hook to use the chat store
export function useChatStore() {
  // Keep a ref to the latest store for stable callbacks
  const storeRef = useRef(store);

  const storeState = useSyncExternalStore(
    subscribeToChatStore,
    getChatStore,
    () => initialState, // Server snapshot - use initial state
  );

  // Keep ref updated
  useEffect(() => {
    storeRef.current = storeState;
  }, [storeState]);

  const addMessage = useCallback((message: ChatMessage) => {
    addChatMessage(message);
  }, []);

  const setStreaming = useCallback((response: string) => {
    setStreamingResponse(response);
  }, []);

  const appendStreaming = useCallback((chunk: string) => {
    appendStreamingResponse(chunk);
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setCurrentPrompt(prompt);
  }, []);

  const updateMessageAt = useCallback(
    (index: number, updates: Partial<Pick<ChatMessage, "chart">>) => {
      updateChatMessageByIndex(index, updates);
    },
    [],
  );

  const clearChat = useCallback(() => {
    clearChatStore();
  }, []);

  const setActiveTab = useCallback((tab: AnalysisTab) => {
    setActiveTabInStore(tab);
  }, []);

  const setLoading = useCallback((isLoading: boolean, pendingPrompt = "") => {
    setLoadingState(isLoading, pendingPrompt);
  }, []);

  return {
    history: storeState.history,
    streamingResponse: storeState.streamingResponse,
    currentPrompt: storeState.currentPrompt,
    activeTab: storeState.activeTab,
    isLoading: storeState.isLoading,
    pendingPrompt: storeState.pendingPrompt,
    addMessage,
    updateMessageAt,
    setStreaming,
    appendStreaming,
    setPrompt,
    clearChat,
    setActiveTab,
    setLoading,
  };
}

export type { AnalysisTab, ChatMessage };
