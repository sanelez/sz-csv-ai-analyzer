import type {
  TabularData,
  ChartConfig,
  SortOrder,
  ChartDataPoint,
} from "./types";

export const processChartData = (
  data: TabularData,
  chart: ChartConfig,
  sortOrder: SortOrder = "none",
  limit = 20,
): ChartDataPoint[] => {
  let result: ChartDataPoint[] = [];

  // Find actual columns (case-insensitive match)
  const xColDef = data.columns.find(
    (c) => c.name.toLowerCase() === chart.xAxis.toLowerCase(),
  );
  const yColDef = data.columns.find(
    (c) => c.name.toLowerCase() === chart.yAxis.toLowerCase(),
  );

  if (!xColDef) return [];

  const xCol = xColDef.name;
  const xIdx = xColDef.index;

  // For count aggregation, we don't need a valid Y column - we just count occurrences
  const isCountMode = chart.aggregation === "count";
  const yCol = yColDef?.name ?? "count";
  const yIdx = yColDef?.index ?? -1;

  // Grouping logic if needed
  if (chart.aggregation && chart.aggregation !== "none") {
    const groups = new Map<
      string,
      { sum: number; count: number; min: number; max: number }
    >();

    data.rows.forEach((row) => {
      const xVal = String(row[xIdx] ?? "").trim();
      if (!xVal) return; // Skip empty X values

      // For count mode, we don't need numeric Y values
      if (isCountMode) {
        const current = groups.get(xVal) ?? {
          sum: 0,
          count: 0,
          min: 0,
          max: 0,
        };
        groups.set(xVal, {
          ...current,
          count: current.count + 1,
        });
      } else if (yIdx >= 0) {
        const yVal = parseFloat(String(row[yIdx] ?? "0"));
        if (!isNaN(yVal)) {
          const current = groups.get(xVal) ?? {
            sum: 0,
            count: 0,
            min: Infinity,
            max: -Infinity,
          };
          groups.set(xVal, {
            sum: current.sum + yVal,
            count: current.count + 1,
            min: Math.min(current.min, yVal),
            max: Math.max(current.max, yVal),
          });
        }
      }
    });

    groups.forEach((stats, key) => {
      let value: number;
      switch (chart.aggregation) {
        case "sum":
          value = stats.sum;
          break;
        case "avg":
          value = stats.count > 0 ? stats.sum / stats.count : 0;
          break;
        case "count":
          value = stats.count;
          break;
        case "min":
          value = stats.min === Infinity ? 0 : stats.min;
          break;
        case "max":
          value = stats.max === -Infinity ? 0 : stats.max;
          break;
        default:
          value = stats.sum;
      }
      result.push({ [xCol]: key, [yCol]: Math.round(value * 100) / 100 });
    });
  } else if (yIdx >= 0) {
    // Raw data logic - only if we have a Y column
    result = data.rows
      .slice(0, Math.min(limit * 2, data.rows.length))
      .map((row) => ({
        [xCol]: row[xIdx] ?? "",
        [yCol]: parseFloat(String(row[yIdx] ?? "0")),
      }))
      .filter((item) => !isNaN(item[yCol] as number));
  }

  // Apply sorting
  if (sortOrder !== "none") {
    result.sort((a, b) => {
      const aVal = a[yCol] as number;
      const bVal = b[yCol] as number;
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }

  // Apply limit
  return result.slice(0, limit);
};
