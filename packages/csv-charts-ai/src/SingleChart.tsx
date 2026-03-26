import { useState, useMemo, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Brush,
  ReferenceLine,
} from "recharts";
import { useChartIcons } from "./IconContext";
import type {
  TabularData,
  ChartConfig,
  ChartType,
  SortOrder,
  ChartDataPoint,
} from "./types";
import { useChartTheme } from "./ThemeContext";
import { processChartDataMultiSeries } from "./processChartData";
import { ChartToolbar } from "./ChartToolbar";

export interface SingleChartProps {
  data: TabularData;
  chart: ChartConfig;
  onRegenerate?: (chart: ChartConfig) => Promise<void>;
  /** Additional CSS class for the chart container */
  className?: string;
  /** When true, removes all built-in Tailwind classes from toolbar and metadata tags */
  unstyled?: boolean;
}

export function SingleChart({
  data,
  chart,
  onRegenerate,
  className,
  unstyled = false,
}: SingleChartProps) {
  const theme = useChartTheme();
  const icons = useChartIcons();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [showBrush, setShowBrush] = useState(false);
  const [showTrendline, setShowTrendline] = useState(false);
  const [limitResults, setLimitResults] = useState<number>(20);

  const processed = useMemo(
    () => processChartDataMultiSeries(data, chart, sortOrder, limitResults),
    [data, chart, sortOrder, limitResults],
  );

  const { data: processedData, seriesKeys } = processed;
  const isMultiSeries = seriesKeys.length > 0;

  // Find actual column names from data
  const xColName =
    data.columns.find(
      (col) =>
        col.name === chart.xAxis ||
        col.name.toLowerCase() === chart.xAxis.toLowerCase(),
    )?.name ?? chart.xAxis;

  const yColName =
    data.columns.find(
      (col) =>
        col.name === chart.yAxis ||
        col.name.toLowerCase() === chart.yAxis.toLowerCase(),
    )?.name ?? chart.yAxis;

  // Calculate average for trend line
  const average = useMemo(() => {
    if (processedData.length === 0 || isMultiSeries) return 0;
    const sum = processedData.reduce((acc, item) => {
      const val = item[yColName];
      return acc + (typeof val === "number" ? val : 0);
    }, 0);
    return sum / processedData.length;
  }, [processedData, yColName, isMultiSeries]);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(chart);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExportCSV = useCallback(() => {
    if (processedData.length === 0) return;

    const escapeField = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = Object.keys(processedData[0] ?? {})
      .map(escapeField)
      .join(",");
    const rows = processedData
      .map((row) =>
        Object.values(row)
          .map((v) => escapeField(String(v)))
          .join(","),
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chart.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [processedData, chart.title]);

  const handleExportPNG = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const svgElement = container.querySelector("svg");
    if (!svgElement) return;

    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Ensure dimensions
    const rect = svgElement.getBoundingClientRect();
    svgClone.setAttribute("width", String(rect.width));
    svgClone.setAttribute("height", String(rect.height));

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2; // retina
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = theme.tooltipBackground;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${chart.title.replace(/\s+/g, "_")}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [chart.title, theme.tooltipBackground]);

  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === "none") return "desc";
      if (prev === "desc") return "asc";
      return "none";
    });
  };

  // Render chart content helper
  const renderChartContent = (
    type: ChartType,
    chartData: ChartDataPoint[],
    xKey: string,
    yKey: string,
    enableBrush?: boolean,
    enableTrendline?: boolean,
    avgValue?: number,
  ) => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 50 },
    };

    const tooltipStyle = {
      backgroundColor: theme.tooltipBackground,
      border: theme.tooltipBorder,
      borderRadius: "8px",
    };

    const brushComponent = enableBrush ? (
      <Brush
        dataKey={xKey}
        height={30}
        stroke={theme.accentPrimary}
        fill="#1e1b4b"
      />
    ) : null;

    const trendlineComponent =
      enableTrendline && avgValue && !isMultiSeries ? (
        <ReferenceLine
          y={avgValue}
          stroke={theme.accentSuccess}
          strokeDasharray="5 5"
          label={{
            value: `Avg: ${avgValue.toFixed(2)}`,
            fill: theme.accentSuccess,
            fontSize: 12,
          }}
        />
      ) : null;

    const xAxisProps = {
      dataKey: xKey,
      stroke: theme.textMuted,
      fontSize: 11,
      angle: -45,
      textAnchor: "end" as const,
      height: 80,
      interval: 0 as const,
      tick: { fill: theme.textMuted },
    };

    const yAxisProps = {
      stroke: theme.textMuted,
      fontSize: 12,
      tick: { fill: theme.textMuted },
    };

    // Multi-series rendering
    if (isMultiSeries && type !== "pie" && type !== "scatter") {
      switch (type) {
        case "bar":
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {seriesKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={theme.colors[i % theme.colors.length]}
                  stackId="stack"
                  radius={
                    i === seriesKeys.length - 1 ? [4, 4, 0, 0] : undefined
                  }
                />
              ))}
              {brushComponent}
            </BarChart>
          );
        case "line":
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={theme.colors[i % theme.colors.length]}
                  strokeWidth={2}
                  dot={{ fill: theme.colors[i % theme.colors.length] }}
                />
              ))}
              {brushComponent}
            </LineChart>
          );
        case "area":
          return (
            <AreaChart {...commonProps}>
              <defs>
                {seriesKeys.map((key, i) => (
                  <linearGradient
                    key={key}
                    id={`grad-${chart.id}-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={theme.colors[i % theme.colors.length]}
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor={theme.colors[i % theme.colors.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {seriesKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={theme.colors[i % theme.colors.length]}
                  fillOpacity={1}
                  fill={`url(#grad-${chart.id}-${i})`}
                  stackId="stack"
                />
              ))}
              {brushComponent}
            </AreaChart>
          );
        default:
          return null;
      }
    }

    // Single-series rendering
    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {trendlineComponent}
            <Bar
              dataKey={yKey}
              fill={theme.accentPrimary}
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={theme.colors[index % theme.colors.length]}
                />
              ))}
            </Bar>
            {brushComponent}
          </BarChart>
        );

      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {trendlineComponent}
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={theme.accentPrimary}
              strokeWidth={3}
              dot={{ fill: theme.accentPrimary }}
              activeDot={{ r: 8 }}
            />
            {brushComponent}
          </LineChart>
        );

      case "area": {
        const gradientId = `colorY-${chart.id}`;
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.accentPrimary}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={theme.accentPrimary}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {trendlineComponent}
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={theme.accentPrimary}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
            {brushComponent}
          </AreaChart>
        );
      }

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} />
            <XAxis type="category" {...xAxisProps} />
            <YAxis type="number" dataKey={yKey} {...yAxisProps} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={tooltipStyle}
            />
            <Legend />
            <Scatter name={yKey} data={chartData} fill={theme.accentPrimary} />
          </ScatterChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey={yKey}
              nameKey={xKey}
              label={({ name, percent }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: theme.textMuted }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={theme.colors[index % theme.colors.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        );

      default:
        return null;
    }
  };

  if (processedData.length === 0) {
    return (
      <div
        className={
          unstyled
            ? (className ?? "")
            : `flex h-[300px] flex-col items-center justify-center gap-4 text-gray-400 ${className ?? ""}`.trim()
        }
      >
        <div className={unstyled ? "" : "text-center"}>
          <p className={unstyled ? "" : "mb-1 font-medium text-red-400"}>
            Unable to generate this chart
          </p>
          <p className={unstyled ? "" : "mb-4 text-sm text-gray-500"}>
            Columns: {chart.xAxis}, {chart.yAxis}
          </p>
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className={
                unstyled
                  ? ""
                  : "flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              }
            >
              <icons.RefreshCw
                className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
              />
              {isRegenerating ? "Regenerating..." : "Regenerate with AI"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ChartToolbar
        chartType={chart.type}
        sortOrder={sortOrder}
        limitResults={limitResults}
        showBrush={showBrush}
        showTrendline={showTrendline}
        isRegenerating={isRegenerating}
        hasRegenerate={!!onRegenerate}
        onToggleSort={toggleSort}
        onLimitChange={setLimitResults}
        onToggleBrush={() => setShowBrush(!showBrush)}
        onToggleTrendline={() => setShowTrendline(!showTrendline)}
        onExportCSV={handleExportCSV}
        onExportPNG={handleExportPNG}
        onRegenerate={handleRegenerate}
        unstyled={unstyled}
      />

      {/* Chart */}
      <div
        className={unstyled ? "" : "h-[450px] w-full"}
        style={unstyled ? { height: 450, width: "100%" } : undefined}
        ref={chartContainerRef}
      >
        <ResponsiveContainer
          key={`chart-${chart.id}-${showBrush ? "brush" : "no-brush"}`}
          width="100%"
          height="100%"
        >
          {renderChartContent(
            chart.type,
            processedData,
            xColName,
            isMultiSeries ? "" : yColName,
            showBrush,
            showTrendline,
            average,
          )}
        </ResponsiveContainer>
      </div>

      {/* Metadata Tags */}
      <div className={unstyled ? "" : "mt-4 flex flex-wrap gap-2"}>
        <span
          className={
            unstyled
              ? ""
              : "rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400"
          }
        >
          X: {chart.xAxis}
        </span>
        <span
          className={
            unstyled
              ? ""
              : "rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400"
          }
        >
          Y: {chart.yAxis}
        </span>
        {chart.groupBy && (
          <span
            className={
              unstyled
                ? ""
                : "rounded bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300"
            }
          >
            Group: {chart.groupBy}
          </span>
        )}
        {chart.aggregation && chart.aggregation !== "none" && (
          <span
            className={
              unstyled
                ? ""
                : "rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300"
            }
          >
            {chart.aggregation}
          </span>
        )}
        <span
          className={
            unstyled
              ? ""
              : "rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400"
          }
        >
          {processedData.length} items
        </span>
        {isMultiSeries && (
          <span
            className={
              unstyled
                ? ""
                : "rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
            }
          >
            {seriesKeys.length} series
          </span>
        )}
      </div>
    </div>
  );
}
