import type { TabularData } from "./types";

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
  primaryData: TabularData,
  compareData: TabularData,
  options: DiffOptions,
): DiffResult {
  const { matchMode, keyColumn = "" } = options;

  const bHeaderSet = new Set(compareData.headers);
  const aHeaderSet = new Set(primaryData.headers);

  const commonHeaders = primaryData.headers.filter((h) => bHeaderSet.has(h));
  const onlyInA = primaryData.headers.filter((h) => !bHeaderSet.has(h));
  const onlyInB = compareData.headers.filter((h) => !aHeaderSet.has(h));

  const rows: DiffRow[] = [];

  // Pre-compute header → index maps to avoid O(n) indexOf calls per row
  const aHeaderIdx = new Map<string, number>();
  const bHeaderIdx = new Map<string, number>();
  for (let i = 0; i < primaryData.headers.length; i++)
    aHeaderIdx.set(primaryData.headers[i]!, i);
  for (let i = 0; i < compareData.headers.length; i++)
    bHeaderIdx.set(compareData.headers[i]!, i);

  // Pre-compute common header index pairs for fast row comparison
  const commonIdxPairs = commonHeaders.map((h) => ({
    header: h,
    aIdx: aHeaderIdx.get(h)!,
    bIdx: bHeaderIdx.get(h)!,
  }));

  const getChangedCols = (
    a: (string | number)[],
    b: (string | number)[],
  ): Set<string> => {
    const changed = new Set<string>();
    for (const { header, aIdx, bIdx } of commonIdxPairs) {
      if (String(a[aIdx] ?? "") !== String(b[bIdx] ?? "")) {
        changed.add(header);
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
    const makeKey = (row: (string | number)[], idxMap: Map<string, number>) =>
      commonHeaders
        .map((h) => String(row[idxMap.get(h)!] ?? ""))
        .join("\0");

    const aMap = new Map<string, { row: (string | number)[]; idx: number }[]>();
    for (let i = 0; i < primaryData.rows.length; i++) {
      const key = makeKey(primaryData.rows[i]!, aHeaderIdx);
      const list = aMap.get(key) ?? [];
      list.push({ row: primaryData.rows[i]!, idx: i });
      aMap.set(key, list);
    }

    const matchedAIndices = new Set<number>();

    for (let i = 0; i < compareData.rows.length; i++) {
      const key = makeKey(compareData.rows[i]!, bHeaderIdx);
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
    const keyIdxA = aHeaderIdx.get(keyColumn)!;
    const keyIdxB = bHeaderIdx.get(keyColumn)!;

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

  // Single-pass count instead of 4 separate filter calls
  const counts: DiffCounts = { same: 0, changed: 0, added: 0, removed: 0 };
  for (const r of rows) {
    counts[r.status]++;
  }

  return { commonHeaders, onlyInA, onlyInB, rows, counts };
}
