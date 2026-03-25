import type {
  TabularData,
  ChartConfig,
  SortOrder,
  ChartDataPoint,
} from "./types";

export interface ProcessedChartResult {
  data: ChartDataPoint[];
  seriesKeys: string[];
  yKey: string;
}

export const processChartData = (
  data: TabularData,
  chart: ChartConfig,
  sortOrder: SortOrder = "none",
  limit = 20,
): ChartDataPoint[] => {
  const result = processChartDataMultiSeries(data, chart, sortOrder, limit);
  return result.data;
};

export const processChartDataMultiSeries = (
  data: TabularData,
  chart: ChartConfig,
  sortOrder: SortOrder = "none",
  limit = 20,
): ProcessedChartResult => {
  let result: ChartDataPoint[] = [];

  // Find actual columns (case-insensitive match)
  const xColDef = data.columns.find(
    (c) => c.name.toLowerCase() === chart.xAxis.toLowerCase(),
  );
  const yColDef = data.columns.find(
    (c) => c.name.toLowerCase() === chart.yAxis.toLowerCase(),
  );
  const groupColDef = chart.groupBy
    ? data.columns.find(
        (c) => c.name.toLowerCase() === chart.groupBy!.toLowerCase(),
      )
    : undefined;

  if (!xColDef) return { data: [], seriesKeys: [], yKey: chart.yAxis };

  const xCol = xColDef.name;
  const xIdx = xColDef.index;

  // For count aggregation, we don't need a valid Y column - we just count occurrences
  const isCountMode = chart.aggregation === "count";
  const yCol = yColDef?.name ?? "count";
  const yIdx = yColDef?.index ?? -1;

  // GroupBy mode: create multi-series data (not supported for pie/scatter)
  const supportsGroupBy = chart.type !== "pie" && chart.type !== "scatter";
  if (
    supportsGroupBy &&
    groupColDef &&
    chart.aggregation &&
    chart.aggregation !== "none"
  ) {
    const groupIdx = groupColDef.index;
    const allGroups = new Set<string>();

    // Nested grouping: xVal -> groupVal -> stats
    const grouped = new Map<
      string,
      Map<string, { sum: number; count: number; min: number; max: number }>
    >();

    data.rows.forEach((row) => {
      const xVal = String(row[xIdx] ?? "").trim();
      const groupVal = String(row[groupIdx] ?? "").trim();
      if (!xVal || !groupVal) return;

      allGroups.add(groupVal);

      if (!grouped.has(xVal)) grouped.set(xVal, new Map());
      const xGroup = grouped.get(xVal)!;

      if (isCountMode) {
        const current = xGroup.get(groupVal) ?? {
          sum: 0,
          count: 0,
          min: 0,
          max: 0,
        };
        xGroup.set(groupVal, { ...current, count: current.count + 1 });
      } else if (yIdx >= 0) {
        const yVal = parseFloat(String(row[yIdx] ?? "0"));
        if (!isNaN(yVal)) {
          const current = xGroup.get(groupVal) ?? {
            sum: 0,
            count: 0,
            min: Infinity,
            max: -Infinity,
          };
          xGroup.set(groupVal, {
            sum: current.sum + yVal,
            count: current.count + 1,
            min: Math.min(current.min, yVal),
            max: Math.max(current.max, yVal),
          });
        }
      }
    });

    const seriesKeys = Array.from(allGroups).slice(0, 8); // max 8 series

    grouped.forEach((groupMap, xKey) => {
      const point: ChartDataPoint = { [xCol]: xKey };
      seriesKeys.forEach((groupKey) => {
        const stats = groupMap.get(groupKey);
        if (stats) {
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
          point[groupKey] = Math.round(value * 100) / 100;
        } else {
          point[groupKey] = 0;
        }
      });
      result.push(point);
    });

    // Sort by first series value or alphabetically
    if (sortOrder !== "none" && seriesKeys[0]) {
      const firstKey = seriesKeys[0];
      result.sort((a, b) => {
        const aVal = (a[firstKey] as number) ?? 0;
        const bVal = (b[firstKey] as number) ?? 0;
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      });
    }

    return {
      data: result.slice(0, limit),
      seriesKeys,
      yKey: yCol,
    };
  }

  // Standard single-series mode (existing logic)
  if (chart.aggregation && chart.aggregation !== "none") {
    const groups = new Map<
      string,
      { sum: number; count: number; min: number; max: number }
    >();

    data.rows.forEach((row) => {
      const xVal = String(row[xIdx] ?? "").trim();
      if (!xVal) return;

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

  return {
    data: result.slice(0, limit),
    seriesKeys: [],
    yKey: yCol,
  };
};
