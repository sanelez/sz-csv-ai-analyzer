import readXlsxFile from "read-excel-file/browser";
import { type CSVData, type CSVColumn, inferColumnType } from "./csv-parser";

/**
 * Check whether a file name indicates an Excel spreadsheet (.xlsx).
 */
export function isXLSXFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".xlsx");
}

/** Supported spreadsheet extensions for accept attributes and validation. */
export const SPREADSHEET_ACCEPT = ".csv,.xlsx";

/** Check if a file is a supported format (CSV or XLSX). */
export function isSupportedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".csv") || lower.endsWith(".xlsx");
}

/**
 * Parse an XLSX file into the same CSVData format used throughout the app.
 * Uses `read-excel-file` which is lightweight (~35 KB) and browser-native.
 * Always reads the first sheet.
 */
export async function parseXLSX(
  file: File,
  options: { hasHeader?: boolean; skipEmptyLines?: boolean } = {},
): Promise<CSVData> {
  const { hasHeader = true, skipEmptyLines = true } = options;

  const rawRows = await readXlsxFile(file);

  // Convert every cell to a string (the rest of the app expects string[][])
  let rows = rawRows.map((row) =>
    row.map((cell) => (cell != null ? String(cell) : "")),
  );

  if (skipEmptyLines) {
    rows = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], columns: [], rowCount: 0 };
  }

  const firstRow = rows[0]!;
  const headers: string[] = hasHeader
    ? firstRow.map((h, i) => h.trim() || `Column ${i + 1}`)
    : firstRow.map((_, i) => `Column ${i + 1}`);

  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Normalise: ensure every row has exactly `headers.length` cells
  const normalizedRows = dataRows.map((row) =>
    headers.map((_, i) => row[i] ?? ""),
  );

  const columns: CSVColumn[] = headers.map((name, index) => {
    const columnValues = normalizedRows.map((row) => row[index] ?? "");
    return { name, type: inferColumnType(columnValues), index };
  });

  return {
    headers,
    rows: normalizedRows,
    columns,
    rowCount: normalizedRows.length,
  };
}
