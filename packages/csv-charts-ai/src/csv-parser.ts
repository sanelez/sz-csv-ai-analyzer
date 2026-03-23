import type { TabularData } from "./types";

export interface ParseCSVOptions {
  /** Column delimiter. Auto-detected if omitted (supports , ; \t |). */
  delimiter?: string;
  /** Whether the first row is a header row (default: true). */
  hasHeader?: boolean;
  /** Skip empty lines (default: true). */
  skipEmpty?: boolean;
}

/**
 * Parse a CSV string into TabularData with automatic delimiter detection
 * and column type inference.
 *
 * Handles quoted fields (RFC 4180), escaped quotes, and mixed line endings.
 *
 * @example
 * ```ts
 * import { parseCSV } from "csv-charts-ai";
 *
 * const data = parseCSV(`name,age,city
 * Alice,30,"New York"
 * Bob,25,Paris`);
 *
 * console.log(data.headers);   // ["name", "age", "city"]
 * console.log(data.rowCount);  // 2
 * console.log(data.columns);   // [{ name: "name", type: "string", ... }, ...]
 * ```
 *
 * @example
 * ```ts
 * // Auto-detects semicolon delimiter
 * const data = parseCSV("nom;age;ville\nAlice;30;Paris");
 *
 * // Explicit delimiter
 * const data = parseCSV(tsv, { delimiter: "\t" });
 *
 * // No header row
 * const data = parseCSV(raw, { hasHeader: false });
 * ```
 *
 * For very complex CSV files (multi-line quoted fields with nested newlines,
 * exotic encodings), consider using PapaParse and passing the result as
 * TabularData directly to the AI functions.
 */
export function parseCSV(
  csv: string,
  options: ParseCSVOptions = {},
): TabularData {
  const { hasHeader = true, skipEmpty = true } = options;

  // Normalize line endings and strip BOM
  const normalized = csv
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (normalized.length === 0) {
    return { headers: [], rows: [], columns: [], rowCount: 0 };
  }

  const delimiter = options.delimiter ?? detectDelimiter(normalized);
  const allRows = parseRows(normalized, delimiter, skipEmpty);

  if (allRows.length === 0) {
    return { headers: [], rows: [], columns: [], rowCount: 0 };
  }

  // Normalize row lengths to match the first row
  const expectedCols = allRows[0]!.length;
  const normalizedRows = allRows.map((row) => {
    if (row.length < expectedCols) {
      return [...row, ...Array<string>(expectedCols - row.length).fill("")];
    }
    return row.slice(0, expectedCols);
  });

  const headers = hasHeader
    ? normalizedRows[0]!
    : normalizedRows[0]!.map((_, i) => `Column ${i + 1}`);
  const dataRows = hasHeader ? normalizedRows.slice(1) : normalizedRows;

  const columns = headers.map((name, index) => ({
    name: name.trim(),
    type: inferColumnType(dataRows, index),
    index,
  }));

  return {
    headers: headers.map((h) => h.trim()),
    rows: dataRows,
    columns,
    rowCount: dataRows.length,
  };
}

// ============ Delimiter Detection ============

function detectDelimiter(csv: string): string {
  const firstLines = csv.split("\n").slice(0, 5);
  const candidates: Record<string, number[]> = {
    ",": [],
    ";": [],
    "\t": [],
    "|": [],
  };

  for (const line of firstLines) {
    let inQuotes = false;
    const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && char in counts) {
        counts[char]!++;
      }
    }
    for (const [delim, count] of Object.entries(counts)) {
      candidates[delim]!.push(count);
    }
  }

  // Best delimiter: consistent count across lines AND highest count
  let best = ",";
  let bestScore = -1;

  for (const [delim, counts] of Object.entries(candidates)) {
    if (counts.length === 0 || counts[0] === 0) continue;

    const allSame = counts.every((c) => c === counts[0]);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    // Prefer consistency, then count
    const score = (allSame ? 1000 : 0) + avgCount;

    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  return best;
}

// ============ Row Parsing (RFC 4180) ============

function parseRows(
  csv: string,
  delimiter: string,
  skipEmpty: boolean,
): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        current.push(field);
        field = "";
      } else if (char === "\n") {
        current.push(field);
        if (!skipEmpty || current.some((c) => c.trim() !== "")) {
          rows.push(current);
        }
        current = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // Last field/row
  current.push(field);
  if (!skipEmpty || current.some((c) => c.trim() !== "")) {
    rows.push(current);
  }

  return rows;
}

// ============ Type Inference ============

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
  /^\d{4}-\d{2}-\d{2}$/, // 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}$/, // 01/15/2024
  /^\d{2}-\d{2}-\d{4}$/, // 01-15-2024
  /^\d{4}\/\d{2}\/\d{2}$/, // 2024/01/15
  /^\d{4}-\d{2}-\d{2}T/, // ISO 8601
  /^\d{2}\.\d{2}\.\d{4}$/, // 15.01.2024
  /^\w{3,9}\s\d{1,2},?\s\d{4}$/, // Jan 15, 2024 / January 15, 2024
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

    if (BOOLEAN_VALUES.has(value.toLowerCase())) {
      booleans++;
    }

    // Check number (handle "1,234.56" and "1 234.56" formats)
    const cleaned = value.replace(/[\s,]/g, "");
    if (cleaned !== "" && !isNaN(Number(cleaned))) {
      numbers++;
    }

    if (DATE_PATTERNS.some((p) => p.test(value))) {
      dates++;
    }
  }

  if (total === 0) return "string";

  const threshold = 0.8;
  // Check booleans first (only if NOT also numbers)
  if (booleans / total >= threshold && numbers / total < 0.5) return "boolean";
  if (dates / total >= threshold) return "date";
  if (numbers / total >= threshold) return "number";
  return "string";
}
