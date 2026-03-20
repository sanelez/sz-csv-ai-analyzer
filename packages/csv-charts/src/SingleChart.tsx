import { useState, useMemo, useCallback } from "react";
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
import { RefreshCw } from "lucide-react";
import type {
  TabularData,
  ChartConfig,
  ChartType,
  SortOrder,
  ChartDataPoint,
} from "./types";
import { COLORS } from "./constants";
import { processChartData } from "./processChartData";
import { ChartToolbar } from "./ChartToolbar";

export interface SingleChartProps {
  data: TabularData;
  chart: ChartConfig;
  onRegenerate?: (chart: ChartConfig) => Promise<void>;
}

export function SingleChart({ data, chart, onRegenerate }: SingleChartProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [showBrush, setShowBrush] = useState(false);
  const [showTrendline, setShowTrendline] = useState(false);
  const [limitResults, setLimitResults] = useState<number>(20);

  const processedData = useMemo(
    () => processChartData(data, chart, sortOrder, limitResults),
    [data, chart, sortOrder, limitResults],
  );

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
    if (processedData.length === 0) return 0;
    const sum = processedData.reduce((acc, item) => {
      const val = item[yColName];
      return acc + (typeof val === "number" ? val : 0);
    }, 0);
    return sum / processedData.length;
  }, [processedData, yColName]);

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

    const headers = Object.keys(processedData[0] ?? {}).join(",");
    const rows = processedData
      .map((row) =>
        Object.values(row)
          .map((v) => `"${String(v)}"`)
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

    const brushComponent = enableBrush ? (
      <Brush dataKey={xKey} height={30} stroke="#8b5cf6" fill="#1e1b4b" />
    ) : null;

    const trendlineComponent =
      enableTrendline && avgValue ? (
        <ReferenceLine
          y={avgValue}
          stroke="#10b981"
          strokeDasharray="5 5"
          label={{
            value: `Avg: ${avgValue.toFixed(2)}`,
            fill: "#10b981",
            fontSize: 12,
          }}
        />
      ) : null;

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xKey}
              stroke="#9ca3af"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {trendlineComponent}
            <Bar dataKey={yKey} fill="#8b5cf6" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
            {brushComponent}
          </BarChart>
        );

      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xKey}
              stroke="#9ca3af"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {trendlineComponent}
            <Line
              type="monotone"
              dataKey={yKey}
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: "#8b5cf6" }}
              activeDot={{ r: 8 }}
            />
            {brushComponent}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xKey}
              stroke="#9ca3af"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {trendlineComponent}
            <Area
              type="monotone"
              dataKey={yKey}
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorY)"
            />
            {brushComponent}
          </AreaChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="category"
              dataKey={xKey}
              stroke="#9ca3af"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              stroke="#9ca3af"
              fontSize={12}
              tick={{ fill: "#9ca3af" }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Scatter name={yKey} data={chartData} fill="#8b5cf6" />
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
              labelLine={{ stroke: "#9ca3af" }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        );

      default:
        return null;
    }
  };

  if (processedData.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-gray-400">
        <div className="text-center">
          <p className="mb-1 font-medium text-red-400">
            Unable to generate this chart
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Columns: {chart.xAxis}, {chart.yAxis}
          </p>
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              <RefreshCw
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
    <div>
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
        onRegenerate={handleRegenerate}
      />

      {/* Chart */}
      <div className="h-[450px] w-full">
        <ResponsiveContainer
          key={`chart-${chart.id}-${showBrush ? "brush" : "no-brush"}`}
          width="100%"
          height="100%"
        >
          {renderChartContent(
            chart.type,
            processedData,
            xColName,
            yColName,
            showBrush,
            showTrendline,
            average,
          )}
        </ResponsiveContainer>
      </div>

      {/* Metadata Tags */}
      <div className="mt-4 flex gap-2">
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400">
          X: {chart.xAxis}
        </span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400">
          Y: {chart.yAxis}
        </span>
        {chart.aggregation && chart.aggregation !== "none" && (
          <span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
            {chart.aggregation}
          </span>
        )}
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400">
          {processedData.length} items
        </span>
      </div>
    </div>
  );
}
