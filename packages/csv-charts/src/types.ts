export type ChartType = "bar" | "line" | "pie" | "scatter" | "area";
export type AggregationType =
  | "sum"
  | "avg"
  | "count"
  | "min"
  | "max"
  | "none";

export interface TabularData {
  headers: string[];
  rows: string[][];
  columns: {
    name: string;
    type: "string" | "number" | "date" | "boolean";
    index: number;
  }[];
  rowCount: number;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  aggregation: AggregationType;
  dataConfig?: {
    xColumn: string;
    yColumn: string;
    groupColumn?: string;
  };
}

export type SortOrder = "none" | "asc" | "desc";
export type ChartDataPoint = Record<string, string | number>;
