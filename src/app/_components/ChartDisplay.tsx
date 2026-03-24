"use client";

import { ChartDisplay as BaseChartDisplay } from "csv-charts-ai/charts";
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
  return (
    <BaseChartDisplay
      data={data}
      charts={charts}
      onRegenerate={onRegenerate}
      cardWrapper={FullscreenCard}
    />
  );
}
