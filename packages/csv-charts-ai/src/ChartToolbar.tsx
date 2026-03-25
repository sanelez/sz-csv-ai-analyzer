import { useChartIcons } from "./IconContext";
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
  onExportPNG: () => void;
  onRegenerate: () => void;
  /** Additional CSS class for the toolbar container */
  className?: string;
  /** When true, removes all built-in Tailwind classes */
  unstyled?: boolean;
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
  onExportPNG,
  onRegenerate,
  className,
  unstyled = false,
}: ChartToolbarProps) {
  const icons = useChartIcons();
  const supportsBrush =
    chartType === "line" || chartType === "area" || chartType === "bar";
  const supportsTrendline =
    chartType === "bar" || chartType === "line" || chartType === "area";

  const cls = (defaultCls: string) => (unstyled ? "" : defaultCls);
  const activeCls = (active: boolean, activeCls: string, inactiveCls: string) =>
    unstyled ? "" : `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? activeCls : inactiveCls}`;

  return (
    <div className={unstyled ? (className ?? "") : `mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 ${className ?? ""}`.trim()}>
      {/* Sort Control */}
      <button
        onClick={onToggleSort}
        className={activeCls(
          sortOrder !== "none",
          "border border-violet-500/30 bg-violet-500/20 text-violet-400",
          "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
        )}
        title="Sort by value"
      >
        {sortOrder === "asc" ? (
          <icons.SortAsc className="h-4 w-4" />
        ) : sortOrder === "desc" ? (
          <icons.SortDesc className="h-4 w-4" />
        ) : (
          <icons.SortDesc className={cls("h-4 w-4 opacity-50")} />
        )}
        Sort
      </button>

      {/* Limit Results */}
      <div className={cls("flex items-center gap-2")}>
        <icons.Filter className={cls("h-4 w-4 text-gray-400")} aria-hidden="true" />
        <select
          value={limitResults}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          aria-label="Limit number of results"
          className={cls("rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-gray-300 focus:border-violet-500/50 focus:outline-none")}
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
          className={activeCls(
            showBrush,
            "border border-cyan-500/30 bg-cyan-500/20 text-cyan-400",
            "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
          )}
          title="Enable zoom/brush"
        >
          <icons.RotateCcw className="h-4 w-4" />
          Zoom
        </button>
      )}

      {/* Trend Line Toggle */}
      {supportsTrendline && (
        <button
          onClick={onToggleTrendline}
          className={activeCls(
            showTrendline,
            "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
            "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
          )}
          title="Show average line"
        >
          <icons.TrendingUp className="h-4 w-4" />
          Average
        </button>
      )}

      <div className={cls("flex-1")} />

      {/* Export PNG Button */}
      <button
        onClick={onExportPNG}
        className={cls("flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white")}
        title="Export chart as PNG image"
      >
        <icons.ImageIcon className="h-4 w-4" />
        PNG
      </button>

      {/* Export CSV Button */}
      <button
        onClick={onExportCSV}
        className={cls("flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white")}
        title="Export chart data as CSV"
      >
        <icons.Download className="h-4 w-4" />
        CSV
      </button>

      {/* Regenerate Button */}
      {hasRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className={cls("flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-sm text-violet-400 transition-colors hover:bg-violet-500/30 disabled:opacity-50")}
        >
          <icons.RefreshCw
            className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
          />
          {isRegenerating ? "..." : "Regenerate"}
        </button>
      )}
    </div>
  );
}
