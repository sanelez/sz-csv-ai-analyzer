import {
  RefreshCw,
  Download,
  SortAsc,
  SortDesc,
  RotateCcw,
  TrendingUp,
  Filter,
} from "lucide-react";
import type { ChartType, SortOrder } from "./types";

interface ChartToolbarProps {
  chartType: ChartType;
  sortOrder: SortOrder;
  limitResults: number;
  showBrush: boolean;
  showTrendline: boolean;
  isRegenerating: boolean;
  hasRegenerate: boolean;
  onToggleSort: () => void;
  onLimitChange: (limit: number) => void;
  onToggleBrush: () => void;
  onToggleTrendline: () => void;
  onExportCSV: () => void;
  onRegenerate: () => void;
}

export function ChartToolbar({
  chartType,
  sortOrder,
  limitResults,
  showBrush,
  showTrendline,
  isRegenerating,
  hasRegenerate,
  onToggleSort,
  onLimitChange,
  onToggleBrush,
  onToggleTrendline,
  onExportCSV,
  onRegenerate,
}: ChartToolbarProps) {
  const supportsBrush =
    chartType === "line" || chartType === "area" || chartType === "bar";
  const supportsTrendline =
    chartType === "bar" || chartType === "line" || chartType === "area";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
      {/* Sort Control */}
      <button
        onClick={onToggleSort}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          sortOrder !== "none"
            ? "border border-violet-500/30 bg-violet-500/20 text-violet-400"
            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        }`}
        title="Sort by value"
      >
        {sortOrder === "asc" ? (
          <SortAsc className="h-4 w-4" />
        ) : sortOrder === "desc" ? (
          <SortDesc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4 opacity-50" />
        )}
        Sort
      </button>

      {/* Limit Results */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={limitResults}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-gray-300 focus:border-violet-500/50 focus:outline-none"
        >
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
          <option value={999999}>All</option>
        </select>
      </div>

      {/* Brush/Zoom Toggle */}
      {supportsBrush && (
        <button
          onClick={onToggleBrush}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            showBrush
              ? "border border-cyan-500/30 bg-cyan-500/20 text-cyan-400"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Enable zoom/brush"
        >
          <RotateCcw className="h-4 w-4" />
          Zoom
        </button>
      )}

      {/* Trend Line Toggle */}
      {supportsTrendline && (
        <button
          onClick={onToggleTrendline}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            showTrendline
              ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Show average line"
        >
          <TrendingUp className="h-4 w-4" />
          Average
        </button>
      )}

      <div className="flex-1" />

      {/* Export Button */}
      <button
        onClick={onExportCSV}
        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        title="Export chart data as CSV"
      >
        <Download className="h-4 w-4" />
        Export
      </button>

      {/* Regenerate Button */}
      {hasRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-sm text-violet-400 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
          />
          {isRegenerating ? "..." : "Regenerate"}
        </button>
      )}
    </div>
  );
}
