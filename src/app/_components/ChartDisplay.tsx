"use client";

import {
  ChartDisplay as BaseChartDisplay,
  type ChartConfig,
} from "@maxgfr/csv-charts";
import type { CSVData } from "~/lib/csv-parser";
import type { ChartSuggestion } from "~/lib/ai-service";
import { FullscreenCard } from "./FullscreenCard";

interface ChartDisplayProps {
  data: CSVData;
  charts: ChartSuggestion[];
  onRegenerate?: (chart: ChartSuggestion) => Promise<void>;
}

export function ChartDisplay({
  data,
  charts,
  onRegenerate,
}: ChartDisplayProps) {
  const handleRegenerate = onRegenerate
    ? async (chart: ChartConfig) => {
        await onRegenerate(chart as unknown as ChartSuggestion);
      }
    : undefined;

  return (
    <BaseChartDisplay
      data={data}
      charts={charts}
      onRegenerate={handleRegenerate}
      cardWrapper={FullscreenCard}
    />
  );
}
