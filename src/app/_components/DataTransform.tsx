"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Filter,
  Columns3,
  Plus,
  X,
  ArrowDownUp,
  Download,
  Undo2,
} from "lucide-react";
import type { CSVData } from "~/lib/csv-parser";

interface DataTransformProps {
  data: CSVData;
  onTransformed?: (data: CSVData) => void;
}

interface ColumnFilter {
  column: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "empty" | "not_empty";
  value: string;
}

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export function DataTransform({ data, onTransformed }: DataTransformProps) {
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(
    new Set(),
  );
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const addFilter = () => {
    if (!data.headers[0]) return;
    setFilters((prev) => [
      ...prev,
      { column: data.headers[0]!, operator: "contains", value: "" },
    ]);
  };

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<ColumnFilter>) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  };

  const toggleColumn = (col: string) => {
    setExcludedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  const resetAll = () => {
    setFilters([]);
    setExcludedColumns(new Set());
    setSortConfig(null);
  };

  const transformedData = useMemo((): CSVData => {
    let rows = [...data.rows];

    // Apply filters
    for (const filter of filters) {
      if (
        !filter.value &&
        filter.operator !== "empty" &&
        filter.operator !== "not_empty"
      )
        continue;
      const colIdx = data.headers.indexOf(filter.column);
      if (colIdx === -1) continue;

      rows = rows.filter((row) => {
        const val = String(row[colIdx] ?? "").toLowerCase();
        const target = filter.value.toLowerCase();
        switch (filter.operator) {
          case "eq":
            return val === target;
          case "neq":
            return val !== target;
          case "gt":
            return parseFloat(val) > parseFloat(target);
          case "lt":
            return parseFloat(val) < parseFloat(target);
          case "contains":
            return val.includes(target);
          case "empty":
            return val.trim() === "";
          case "not_empty":
            return val.trim() !== "";
          default:
            return true;
        }
      });
    }

    // Apply sort
    if (sortConfig) {
      const sortIdx = data.headers.indexOf(sortConfig.column);
      if (sortIdx !== -1) {
        const col = data.columns.find((c) => c.name === sortConfig.column);
        rows.sort((a, b) => {
          const aVal = a[sortIdx] ?? "";
          const bVal = b[sortIdx] ?? "";
          let cmp: number;
          if (col?.type === "number") {
            cmp = parseFloat(String(aVal)) - parseFloat(String(bVal));
          } else {
            cmp = String(aVal).localeCompare(String(bVal));
          }
          return sortConfig.direction === "desc" ? -cmp : cmp;
        });
      }
    }

    // Apply column exclusion
    const includedColumns = data.columns.filter(
      (c) => !excludedColumns.has(c.name),
    );
    const includedIndices = includedColumns.map((c) => c.index);
    const filteredHeaders = includedColumns.map((c) => c.name);
    const filteredRows = rows.map((row) =>
      includedIndices.map((idx) => row[idx] ?? ""),
    );
    const filteredColumns = includedColumns.map((c, i) => ({
      ...c,
      index: i,
    }));

    return {
      headers: filteredHeaders,
      rows: filteredRows,
      columns: filteredColumns,
      rowCount: filteredRows.length,
    };
  }, [data, filters, excludedColumns, sortConfig]);

  const handleApply = useCallback(() => {
    onTransformed?.(transformedData);
  }, [onTransformed, transformedData]);

  const handleExport = useCallback(() => {
    const csv = [
      transformedData.headers.join(","),
      ...transformedData.rows.map((r) =>
        r.map((v) => `"${String(v)}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transformed-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [transformedData]);

  const hasTransforms =
    filters.length > 0 || excludedColumns.size > 0 || sortConfig !== null;

  return (
    <div className="glass-card animate-fade-in p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-xl border border-fuchsia-500/30 bg-linear-to-br from-fuchsia-500/20 to-pink-500/20 p-3">
          <Filter className="h-6 w-6 text-fuchsia-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">Data Transforms</h3>
          <p className="text-sm text-gray-400">
            Filter, sort, and reshape before analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-mono">{transformedData.rowCount}</span>
          <span>/</span>
          <span className="font-mono">{data.rowCount}</span>
          <span>rows</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Column Toggles */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Columns3 className="h-4 w-4" />
            Columns
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.headers.map((header) => (
              <button
                key={header}
                onClick={() => toggleColumn(header)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  excludedColumns.has(header)
                    ? "border border-red-500/20 bg-red-500/10 text-red-400 line-through"
                    : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {header}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <ArrowDownUp className="h-4 w-4" />
            Sort
          </div>
          <div className="flex gap-2">
            <select
              value={sortConfig?.column ?? ""}
              onChange={(e) =>
                setSortConfig(
                  e.target.value
                    ? {
                        column: e.target.value,
                        direction: sortConfig?.direction ?? "asc",
                      }
                    : null,
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 focus:border-violet-500/50 focus:outline-none"
            >
              <option value="">No sort</option>
              {data.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {sortConfig && (
              <select
                value={sortConfig.direction}
                onChange={(e) =>
                  setSortConfig({
                    ...sortConfig,
                    direction: e.target.value as "asc" | "desc",
                  })
                }
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 focus:border-violet-500/50 focus:outline-none"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            )}
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="space-y-2">
            {filters.map((filter, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={filter.column}
                  onChange={(e) => updateFilter(i, { column: e.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-gray-300 focus:outline-none"
                >
                  {data.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter(i, {
                      operator: e.target.value as ColumnFilter["operator"],
                    })
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-gray-300 focus:outline-none"
                >
                  <option value="contains">contains</option>
                  <option value="eq">equals</option>
                  <option value="neq">not equals</option>
                  <option value="gt">greater than</option>
                  <option value="lt">less than</option>
                  <option value="empty">is empty</option>
                  <option value="not_empty">is not empty</option>
                </select>
                {filter.operator !== "empty" &&
                  filter.operator !== "not_empty" && (
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) =>
                        updateFilter(i, { value: e.target.value })
                      }
                      placeholder="Value..."
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-violet-500/50 focus:outline-none"
                    />
                  )}
                <button
                  onClick={() => removeFilter(i)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addFilter}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add filter
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-white/10 pt-4">
          {onTransformed && (
            <button
              onClick={handleApply}
              disabled={!hasTransforms}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Apply to analysis
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {hasTransforms && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Undo2 className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
