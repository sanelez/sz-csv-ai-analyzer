import Papa, { type ParseResult } from "papaparse";
import { generateDataSummary as pkgGenerateDataSummary } from "csv-charts-ai";

export interface CSVColumn {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  index: number;
}

export interface CSVData {
  headers: string[];
  rows: string[][];
  columns: CSVColumn[];
  rowCount: number;
}

export interface CSVSettings {
  delimiter: string;
  hasHeader: boolean;
  encoding: string;
  skipEmptyLines: boolean;
}

export const DEFAULT_CSV_SETTINGS: CSVSettings = {
  delimiter: "",
  hasHeader: true,
  encoding: "UTF-8",
  skipEmptyLines: true,
};

const detectDelimiter = (sample: string): string => {
  const delimiters = [",", ";", "\t", "|"];
  const counts = delimiters.map((d) => ({
    delimiter: d,
    count: (sample.match(new RegExp(`\\${d}`, "g")) ?? []).length,
  }));
  const best = counts.reduce((a, b) => (a.count > b.count ? a : b));
  return best.count > 0 ? best.delimiter : ",";
};

export const inferColumnType = (
  values: string[],
): "string" | "number" | "date" | "boolean" => {
  const sampleSize = Math.min(values.length, 100);
  const sample = values.slice(0, sampleSize).filter((v) => v.trim() !== "");

  if (sample.length === 0) return "string";

  // Check for boolean
  const booleanValues = ["true", "false", "yes", "no", "1", "0", "oui", "non"];
  const isBool = sample.every((v) =>
    booleanValues.includes(v.toLowerCase().trim()),
  );
  if (isBool) return "boolean";

  // Check for number
  const isNumber = sample.every((v) => {
    const cleaned = v.replace(/[\s,]/g, "");
    return !isNaN(parseFloat(cleaned)) && isFinite(Number(cleaned));
  });
  if (isNumber) return "number";

  // Check for date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
    /^\d{4}\/\d{2}\/\d{2}$/,
  ];
  const isDate = sample.every((v) =>
    datePatterns.some((pattern) => pattern.test(v.trim())),
  );
  if (isDate) return "date";

  return "string";
};

export const parseCSV = (
  content: string,
  settings: CSVSettings = DEFAULT_CSV_SETTINGS,
): CSVData => {
  const delimiter =
    settings.delimiter || detectDelimiter(content.slice(0, 2000));

  const result: ParseResult<string[]> = Papa.parse<string[]>(content, {
    delimiter,
    skipEmptyLines: settings.skipEmptyLines,
  });

  const allRows: string[][] = result.data;

  if (allRows.length === 0) {
    return {
      headers: [],
      rows: [],
      columns: [],
      rowCount: 0,
    };
  }

  const firstRow = allRows[0] ?? [];
  const headers: string[] = settings.hasHeader
    ? firstRow.map((h: string, i: number) => h.trim() || `Column ${i + 1}`)
    : firstRow.map((_: string, i: number) => `Column ${i + 1}`);

  const dataRows: string[][] = settings.hasHeader ? allRows.slice(1) : allRows;

  const columns: CSVColumn[] = headers.map((name, index) => {
    const columnValues = dataRows.map((row) => row[index] ?? "");
    return {
      name,
      type: inferColumnType(columnValues),
      index,
    };
  });

  return {
    headers,
    rows: dataRows,
    columns,
    rowCount: dataRows.length,
  };
};

/**
 * Generate a detailed human-readable summary of CSV data.
 * Delegates to the csv-charts-ai package (CSVData is structurally identical to TabularData).
 */
export const generateDataSummary = (data: CSVData): string => {
  return pkgGenerateDataSummary(data);
};
