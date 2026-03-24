import type { TabularData } from "./types";

export interface ParseXLSXOptions {
  /** Whether the first row is a header row (default: true). */
  hasHeader?: boolean;
  /** Skip empty lines (default: true). */
  skipEmpty?: boolean;
}

// ============ Type Inference (shared with csv-parser) ============

const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "yes",
  "no",
  "vrai",
  "faux",
  "oui",
  "non",
]);

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{4}-\d{2}-\d{2}T/,
  /^\d{2}\.\d{2}\.\d{4}$/,
  /^\w{3,9}\s\d{1,2},?\s\d{4}$/,
];

function inferColumnType(
  rows: string[][],
  colIndex: number,
): "string" | "number" | "date" | "boolean" {
  const sampleSize = Math.min(rows.length, 100);
  let numbers = 0;
  let dates = 0;
  let booleans = 0;
  let total = 0;

  for (let i = 0; i < sampleSize; i++) {
    const value = rows[i]?.[colIndex]?.trim() ?? "";
    if (value === "") continue;
    total++;

    if (BOOLEAN_VALUES.has(value.toLowerCase())) booleans++;

    const cleaned = value.replace(/[\s,]/g, "");
    if (cleaned !== "" && !isNaN(Number(cleaned))) numbers++;

    if (DATE_PATTERNS.some((p) => p.test(value))) dates++;
  }

  if (total === 0) return "string";
  const threshold = 0.8;
  if (booleans / total >= threshold && numbers / total < 0.5) return "boolean";
  if (dates / total >= threshold) return "date";
  if (numbers / total >= threshold) return "number";
  return "string";
}

// ============ Core conversion (universal, no dependencies) ============

/**
 * Convert raw XLSX rows (as returned by `read-excel-file`) into TabularData.
 *
 * This function is **universal** — it works in Node.js, browsers, and web workers.
 * You read the file yourself with `read-excel-file` (or any other XLSX parser)
 * and pass the resulting rows here.
 *
 * @example
 * ```ts
 * // Node.js
 * import readXlsxFile from "read-excel-file/node";
 * import { convertXLSXRows } from "csv-charts-ai";
 *
 * const rows = await readXlsxFile("data.xlsx");
 * const data = convertXLSXRows(rows);
 * ```
 *
 * @example
 * ```ts
 * // Browser
 * import readXlsxFile from "read-excel-file/browser";
 * import { convertXLSXRows } from "csv-charts-ai";
 *
 * const rows = await readXlsxFile(file);
 * const data = convertXLSXRows(rows);
 * ```
 */
export function convertXLSXRows(
  rawRows: (string | number | boolean | Date | null)[][],
  options: ParseXLSXOptions = {},
): TabularData {
  const { hasHeader = true, skipEmpty = true } = options;

  // Convert all cells to strings
  let rows = rawRows.map((row) =>
    row.map((cell) => (cell != null ? String(cell) : "")),
  );

  if (skipEmpty) {
    rows = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], columns: [], rowCount: 0 };
  }

  const firstRow = rows[0]!;
  const headers = hasHeader
    ? firstRow.map((h, i) => h.trim() || `Column ${i + 1}`)
    : firstRow.map((_, i) => `Column ${i + 1}`);

  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Normalize: ensure every row has exactly `headers.length` cells
  const normalizedRows = dataRows.map((row) =>
    headers.map((_, i) => row[i] ?? ""),
  );

  const columns = headers.map((name, index) => ({
    name,
    type: inferColumnType(normalizedRows, index),
    index,
  }));

  return { headers, rows: normalizedRows, columns, rowCount: normalizedRows.length };
}

// ============ Browser convenience ============

/**
 * Parse an Excel (.xlsx) file into TabularData. **Browser only.**
 *
 * `read-excel-file` is bundled — no extra install needed.
 * Always reads the first sheet.
 *
 * @example
 * ```tsx
 * import { parseXLSX } from "csv-charts-ai";
 *
 * const handleFile = async (file: File) => {
 *   const data = await parseXLSX(file);
 *   console.log(data.headers, data.rowCount);
 * };
 * ```
 */
export async function parseXLSX(
  file: File,
  options: ParseXLSXOptions = {},
): Promise<TabularData> {
  const mod = await import("read-excel-file/browser");
  const result = await mod.default(file);
  const rawRows = result as (string | number | boolean | Date | null)[][];
  return convertXLSXRows(rawRows, options);
}
