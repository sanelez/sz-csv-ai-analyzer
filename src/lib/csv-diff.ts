import type { CSVData } from "./csv-parser";

/* ── Types ── */

export type MatchMode = "index" | "key" | "content";
export type DiffStatus = "same" | "changed" | "added" | "removed";

export interface DiffRow {
  indexA: number | null;
  indexB: number | null;
  status: DiffStatus;
  rowA: (string | number)[] | null;
  rowB: (string | number)[] | null;
  changedCols: Set<string>;
}

export interface DiffCounts {
  same: number;
  changed: number;
  added: number;
  removed: number;
}

export interface DiffResult {
  commonHeaders: string[];
  onlyInA: string[];
  onlyInB: string[];
  rows: DiffRow[];
  counts: DiffCounts;
}

export interface DiffOptions {
  matchMode: MatchMode;
  keyColumn?: string;
}

/* ── Diff computation ── */

export function computeDiff(
  primaryData: CSVData,
  compareData: CSVData,
  options: DiffOptions,
): DiffResult {
  const { matchMode, keyColumn = "" } = options;

  const commonHeaders = primaryData.headers.filter((h) =>
    compareData.headers.includes(h),
  );
  const onlyInA = primaryData.headers.filter(
    (h) => !compareData.headers.includes(h),
  );
  const onlyInB = compareData.headers.filter(
    (h) => !primaryData.headers.includes(h),
  );

  const rows: DiffRow[] = [];

  const getChangedCols = (
    a: (string | number)[],
    b: (string | number)[],
  ): Set<string> => {
    const changed = new Set<string>();
    for (const h of commonHeaders) {
      const aIdx = primaryData.headers.indexOf(h);
      const bIdx = compareData.headers.indexOf(h);
      if (String(a[aIdx] ?? "") !== String(b[bIdx] ?? "")) {
        changed.add(h);
      }
    }
    return changed;
  };

  // Determine effective match mode
  const effectiveMode =
    matchMode === "content"
      ? "content"
      : matchMode === "key" && keyColumn && commonHeaders.includes(keyColumn)
        ? "key"
        : "index";

  if (effectiveMode === "content") {
    const makeKey = (row: (string | number)[], headers: string[]) =>
      commonHeaders
        .map((h) => String(row[headers.indexOf(h)] ?? ""))
        .join("\0");

    const aMap = new Map<string, { row: (string | number)[]; idx: number }[]>();
    for (let i = 0; i < primaryData.rows.length; i++) {
      const key = makeKey(primaryData.rows[i]!, primaryData.headers);
      const list = aMap.get(key) ?? [];
      list.push({ row: primaryData.rows[i]!, idx: i });
      aMap.set(key, list);
    }

    const matchedAIndices = new Set<number>();

    for (let i = 0; i < compareData.rows.length; i++) {
      const key = makeKey(compareData.rows[i]!, compareData.headers);
      const candidates = aMap.get(key);

      if (candidates) {
        const match = candidates.find((c) => !matchedAIndices.has(c.idx));
        if (match) {
          matchedAIndices.add(match.idx);
          rows.push({
            indexA: match.idx,
            indexB: i,
            status: "same",
            rowA: match.row,
            rowB: compareData.rows[i]!,
            changedCols: new Set(),
          });
        } else {
          rows.push({
            indexA: null,
            indexB: i,
            status: "added",
            rowA: null,
            rowB: compareData.rows[i]!,
            changedCols: new Set(),
          });
        }
      } else {
        rows.push({
          indexA: null,
          indexB: i,
          status: "added",
          rowA: null,
          rowB: compareData.rows[i]!,
          changedCols: new Set(),
        });
      }
    }

    for (let i = 0; i < primaryData.rows.length; i++) {
      if (!matchedAIndices.has(i)) {
        rows.push({
          indexA: i,
          indexB: null,
          status: "removed",
          rowA: primaryData.rows[i]!,
          rowB: null,
          changedCols: new Set(),
        });
      }
    }
  } else if (effectiveMode === "index") {
    const maxLen = Math.max(primaryData.rows.length, compareData.rows.length);
    for (let i = 0; i < maxLen; i++) {
      const a = i < primaryData.rows.length ? primaryData.rows[i]! : null;
      const b = i < compareData.rows.length ? compareData.rows[i]! : null;

      if (!a) {
        rows.push({
          indexA: null,
          indexB: i,
          status: "added",
          rowA: null,
          rowB: b,
          changedCols: new Set(),
        });
      } else if (!b) {
        rows.push({
          indexA: i,
          indexB: null,
          status: "removed",
          rowA: a,
          rowB: null,
          changedCols: new Set(),
        });
      } else {
        const changedCols = getChangedCols(a, b);
        rows.push({
          indexA: i,
          indexB: i,
          status: changedCols.size > 0 ? "changed" : "same",
          rowA: a,
          rowB: b,
          changedCols,
        });
      }
    }
  } else {
    // Key-based matching
    const keyIdxA = primaryData.headers.indexOf(keyColumn);
    const keyIdxB = compareData.headers.indexOf(keyColumn);

    const aMap = new Map<string, { row: (string | number)[]; idx: number }>();
    const bMap = new Map<string, { row: (string | number)[]; idx: number }>();

    for (let i = 0; i < primaryData.rows.length; i++) {
      const key = String(primaryData.rows[i]![keyIdxA] ?? "");
      if (!aMap.has(key)) aMap.set(key, { row: primaryData.rows[i]!, idx: i });
    }
    for (let i = 0; i < compareData.rows.length; i++) {
      const key = String(compareData.rows[i]![keyIdxB] ?? "");
      if (!bMap.has(key)) bMap.set(key, { row: compareData.rows[i]!, idx: i });
    }

    const processedBKeys = new Set<string>();

    for (const [key, aEntry] of aMap) {
      const bEntry = bMap.get(key);
      if (bEntry) {
        processedBKeys.add(key);
        const changedCols = getChangedCols(aEntry.row, bEntry.row);
        rows.push({
          indexA: aEntry.idx,
          indexB: bEntry.idx,
          status: changedCols.size > 0 ? "changed" : "same",
          rowA: aEntry.row,
          rowB: bEntry.row,
          changedCols,
        });
      } else {
        rows.push({
          indexA: aEntry.idx,
          indexB: null,
          status: "removed",
          rowA: aEntry.row,
          rowB: null,
          changedCols: new Set(),
        });
      }
    }

    for (const [key, bEntry] of bMap) {
      if (!processedBKeys.has(key)) {
        rows.push({
          indexA: null,
          indexB: bEntry.idx,
          status: "added",
          rowA: null,
          rowB: bEntry.row,
          changedCols: new Set(),
        });
      }
    }
  }

  const counts: DiffCounts = {
    same: rows.filter((r) => r.status === "same").length,
    changed: rows.filter((r) => r.status === "changed").length,
    added: rows.filter((r) => r.status === "added").length,
    removed: rows.filter((r) => r.status === "removed").length,
  };

  return { commonHeaders, onlyInA, onlyInB, rows, counts };
}
