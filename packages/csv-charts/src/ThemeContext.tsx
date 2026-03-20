import { createContext, useContext } from "react";
import { type ChartTheme, defaultDarkTheme } from "./types";

const ChartThemeContext = createContext<ChartTheme>(defaultDarkTheme);

export function ChartThemeProvider({
  theme,
  children,
}: {
  theme: ChartTheme;
  children: React.ReactNode;
}) {
  return (
    <ChartThemeContext.Provider value={theme}>
      {children}
    </ChartThemeContext.Provider>
  );
}

export function useChartTheme(): ChartTheme {
  return useContext(ChartThemeContext);
}
