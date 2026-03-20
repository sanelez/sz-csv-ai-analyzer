"use client";

import { useState, useMemo } from "react";
import { GitCompareArrows, Upload, X, ArrowRight } from "lucide-react";
import {
  type CSVData,
  type CSVSettings,
  DEFAULT_CSV_SETTINGS,
  parseCSV,
} from "~/lib/csv-parser";

interface CSVCompareProps {
  primaryData: CSVData;
  csvSettings?: CSVSettings;
}

export function CSVCompare({
  primaryData,
  csvSettings = DEFAULT_CSV_SETTINGS,
}: CSVCompareProps) {
  const [compareData, setCompareData] = useState<CSVData | null>(null);
  const [compareFileName, setCompareFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const data = parseCSV(content, csvSettings);
      setCompareData(data);
      setCompareFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const comparison = useMemo(() => {
    if (!compareData) return null;

    const commonHeaders = primaryData.headers.filter((h) =>
      compareData.headers.includes(h),
    );
    const onlyInPrimary = primaryData.headers.filter(
      (h) => !compareData.headers.includes(h),
    );
    const onlyInCompare = compareData.headers.filter(
      (h) => !primaryData.headers.includes(h),
    );

    // Compare numeric stats for common columns
    const stats = commonHeaders.map((header) => {
      const pIdx = primaryData.headers.indexOf(header);
      const cIdx = compareData.headers.indexOf(header);

      const pCol = primaryData.columns.find((c) => c.name === header);
      if (pCol?.type !== "number") {
        // Count distinct values for non-numeric
        const pDistinct = new Set(primaryData.rows.map((r) => r[pIdx])).size;
        const cDistinct = new Set(compareData.rows.map((r) => r[cIdx])).size;
        return {
          column: header,
          type: "categorical" as const,
          primary: { distinct: pDistinct },
          compare: { distinct: cDistinct },
        };
      }

      const pValues = primaryData.rows
        .map((r) => parseFloat(String(r[pIdx] ?? "")))
        .filter((v) => !isNaN(v));
      const cValues = compareData.rows
        .map((r) => parseFloat(String(r[cIdx] ?? "")))
        .filter((v) => !isNaN(v));

      if (pValues.length === 0 && cValues.length === 0) {
        return {
          column: header,
          type: "categorical" as const,
          primary: { distinct: 0 },
          compare: { distinct: 0 },
        };
      }

      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
      const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

      return {
        column: header,
        type: "numeric" as const,
        primary: {
          count: pValues.length,
          avg: avg(pValues),
          min: min(pValues),
          max: max(pValues),
        },
        compare: {
          count: cValues.length,
          avg: avg(cValues),
          min: min(cValues),
          max: max(cValues),
        },
      };
    });

    return { commonHeaders, onlyInPrimary, onlyInCompare, stats };
  }, [primaryData, compareData]);

  const fmt = (n: number) =>
    Math.abs(n) >= 1000
      ? n.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : n.toFixed(2);

  const diffColor = (a: number, b: number) => {
    if (a === b) return "text-gray-400";
    return a > b ? "text-emerald-400" : "text-red-400";
  };

  return (
    <div className="glass-card animate-fade-in p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-xl border border-cyan-500/30 bg-linear-to-br from-cyan-500/20 to-blue-500/20 p-3">
          <GitCompareArrows className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">CSV Compare</h3>
          <p className="text-sm text-gray-400">
            Upload a second CSV to compare
          </p>
        </div>
      </div>

      {!compareData ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-white/10 bg-white/5"
          }`}
        >
          <Upload className="mb-3 h-8 w-8 text-gray-500" />
          <p className="mb-2 text-sm text-gray-400">
            Drag & drop a CSV file to compare
          </p>
          <label className="cursor-pointer rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/30">
            Browse files
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header with file info */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">
                Comparing with{" "}
                <span className="font-medium text-cyan-400">
                  {compareFileName}
                </span>
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                {primaryData.rowCount} vs {compareData.rowCount} rows
              </span>
            </div>
            <button
              onClick={() => {
                setCompareData(null);
                setCompareFileName("");
              }}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Column diff */}
          {comparison && (
            <>
              {(comparison.onlyInPrimary.length > 0 ||
                comparison.onlyInCompare.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {comparison.onlyInPrimary.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="mb-1 text-xs font-medium text-amber-400">
                        Only in primary file
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {comparison.onlyInPrimary.map((h) => (
                          <span
                            key={h}
                            className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {comparison.onlyInCompare.length > 0 && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                      <p className="mb-1 text-xs font-medium text-blue-400">
                        Only in compare file
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {comparison.onlyInCompare.map((h) => (
                          <span
                            key={h}
                            className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats comparison table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                        Column
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
                        Primary
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400" />
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
                        Compare
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">
                        Delta
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.stats.map((stat) => {
                      if (stat.type === "categorical") {
                        return (
                          <tr
                            key={stat.column}
                            className="border-b border-white/5"
                          >
                            <td className="px-4 py-2 font-medium text-gray-300">
                              {stat.column}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-400">
                              {stat.primary.distinct} distinct
                            </td>
                            <td className="px-4 py-2 text-center">
                              <ArrowRight className="mx-auto h-3 w-3 text-gray-600" />
                            </td>
                            <td className="px-4 py-2 text-right text-gray-400">
                              {stat.compare.distinct} distinct
                            </td>
                            <td className="px-4 py-2 text-right text-gray-500">
                              —
                            </td>
                          </tr>
                        );
                      }
                      const delta = stat.compare.avg - stat.primary.avg;
                      const pct =
                        stat.primary.avg !== 0
                          ? (delta / stat.primary.avg) * 100
                          : 0;
                      return (
                        <tr
                          key={stat.column}
                          className="border-b border-white/5"
                        >
                          <td className="px-4 py-2 font-medium text-gray-300">
                            {stat.column}
                            <span className="ml-1 text-xs text-gray-600">
                              avg
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-gray-300">
                            {fmt(stat.primary.avg)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <ArrowRight className="mx-auto h-3 w-3 text-gray-600" />
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-gray-300">
                            {fmt(stat.compare.avg)}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono ${diffColor(stat.compare.avg, stat.primary.avg)}`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {fmt(delta)}{" "}
                            <span className="text-xs opacity-60">
                              ({pct >= 0 ? "+" : ""}
                              {pct.toFixed(1)}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
