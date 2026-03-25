"use client";

import {
  ChartDisplay as BaseChartDisplay,
  ChartIconProvider,
} from "csv-charts-ai/charts";
import {
  RefreshCw,
  Download,
  SortAsc,
  SortDesc,
  RotateCcw,
  TrendingUp,
  Filter,
  Image,
} from "lucide-react";
import type { CSVData } from "~/lib/csv-parser";
import type { ChartSuggestion } from "~/lib/ai-service";
import { FullscreenCard } from "./FullscreenCard";

const lucideIcons = {
  RefreshCw,
  Download,
  SortAsc,
  SortDesc,
  RotateCcw,
  TrendingUp,
  Filter,
  ImageIcon: Image,
};

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
    <ChartIconProvider icons={lucideIcons}>
      <BaseChartDisplay
        data={data}
        charts={charts}
        onRegenerate={onRegenerate}
        cardWrapper={FullscreenCard}
      />
    </ChartIconProvider>
  );
}
