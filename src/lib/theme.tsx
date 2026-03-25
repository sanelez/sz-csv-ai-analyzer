"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Cookies from "js-cookie";

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const THEME_COOKIE = "csv-ai-theme";
const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 365,
  secure: true,
  sameSite: "strict",
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "auto",
  resolved: "dark",
  setMode: () => {},
});

function resolveTheme(mode: ThemeMode, systemDark: boolean): "light" | "dark" {
  if (mode === "auto") return systemDark ? "dark" : "light";
  return mode;
}

function applyTheme(resolved: "light" | "dark") {
  const html = document.documentElement;
  html.classList.toggle("dark", resolved === "dark");
  html.classList.toggle("light", resolved === "light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto";
    return (Cookies.get(THEME_COOKIE) as ThemeMode) || "auto";
  });

  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const resolved = resolveTheme(mode, systemDark);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    Cookies.set(THEME_COOKIE, next, COOKIE_OPTIONS);
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply class to <html> whenever resolved theme changes
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
