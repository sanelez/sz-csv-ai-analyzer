"use client";

import { useState, useMemo } from "react";
import {
  GitCompareArrows,
  Upload,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileSpreadsheet,
  Columns3,
} from "lucide-react";
import { toast } from "sonner";
import {
  type CSVData,
  type CSVSettings,
  DEFAULT_CSV_SETTINGS,
  parseCSV,
} from "~/lib/csv-parser";

interface CSVCompareProps {
  primaryData: CSVData;
  primaryFileName?: string;
  csvSettings?: CSVSettings;
}

export function CSVCompare({
  primaryData,
  primaryFileName = "Original file",
  csvSettings = DEFAULT_CSV_SETTINGS,
}: CSVCompareProps) {
  const [compareData, setCompareData] = useState<CSVData | null>(null);
  const [compareFileName, setCompareFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = parseCSV(content, csvSettings);
        setCompareData(data);
        setCompareFileName(file.name);
      } catch {
        toast.error("Failed to parse CSV", {
          description: "Please check that the file is a valid CSV.",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith(".csv")) {
      handleFile(file);
    } else if (file) {
      toast.error("Invalid file type", {
        description: "Please upload a .csv file.",
      });
    }
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

  return (
    <div className="glass-card animate-fade-in flex flex-1 flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-xl border border-cyan-500/30 bg-linear-to-br from-cyan-500/20 to-blue-500/20 p-3">
          <GitCompareArrows className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">CSV Compare</h3>
          <p className="text-sm text-gray-400">
            {compareData
              ? "Side-by-side comparison of your two files"
              : "Upload a second CSV to compare with your data"}
          </p>
        </div>
        {compareData && (
          <button
            onClick={() => {
              setCompareData(null);
              setCompareFileName("");
            }}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      {!compareData ? (
        /* Upload zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${
            isDragging
              ? "scale-[1.01] border-cyan-500 bg-cyan-500/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }`}
        >
          <div className="mb-4 rounded-full border border-white/10 bg-white/5 p-4">
            <Upload className="h-6 w-6 text-gray-500" />
          </div>
          <p className="mb-1 text-sm font-medium text-gray-300">
            Drop a CSV file here
          </p>
          <p className="mb-4 text-xs text-gray-500">
            or browse to select a file for comparison
          </p>
          <label className="cursor-pointer rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20">
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
        <div className="space-y-5">
          {/* File overview cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-medium tracking-wider text-gray-500 uppercase">
                  File A
                </span>
              </div>
              <p
                className="truncate text-sm font-medium text-gray-200"
                title={primaryFileName}
              >
                {primaryFileName}
              </p>
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span>
                  <span className="font-mono text-gray-300">
                    {primaryData.rowCount}
                  </span>{" "}
                  rows
                </span>
                <span>
                  <span className="font-mono text-gray-300">
                    {primaryData.headers.length}
                  </span>{" "}
                  cols
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-medium tracking-wider text-gray-500 uppercase">
                  File B
                </span>
              </div>
              <p
                className="truncate text-sm font-medium text-gray-200"
                title={compareFileName}
              >
                {compareFileName}
              </p>
              <div className="mt-2 flex gap-3 text-xs text-gray-500">
                <span>
                  <span className="font-mono text-gray-300">
                    {compareData.rowCount}
                  </span>{" "}
                  rows
                </span>
                <span>
                  <span className="font-mono text-gray-300">
                    {compareData.headers.length}
                  </span>{" "}
                  cols
                </span>
              </div>
            </div>
          </div>

          {comparison && (
            <>
              {/* Schema differences */}
              {(comparison.onlyInPrimary.length > 0 ||
                comparison.onlyInCompare.length > 0) && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">
                      Schema differences
                    </span>
                  </div>
                  <div className="space-y-3">
                    {comparison.onlyInPrimary.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-amber-400/80">
                          Only in File A
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {comparison.onlyInPrimary.map((h) => (
                            <span
                              key={h}
                              className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {comparison.onlyInCompare.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-blue-400/80">
                          Only in File B
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {comparison.onlyInCompare.map((h) => (
                            <span
                              key={h}
                              className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Column comparison */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm font-medium text-gray-300">
                    Column comparison
                  </span>
                  <span className="text-xs text-gray-500">
                    {comparison.commonHeaders.length} shared column
                    {comparison.commonHeaders.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                          Column
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-violet-400/60">
                          File A
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-cyan-400/60">
                          File B
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.stats.map((stat) => {
                        if (stat.type === "categorical") {
                          const delta =
                            stat.compare.distinct - stat.primary.distinct;
                          return (
                            <tr
                              key={stat.column}
                              className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                            >
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-gray-300">
                                  {stat.column}
                                </span>
                                <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                                  text
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-gray-400">
                                {stat.primary.distinct}
                                <span className="ml-1 font-sans text-xs text-gray-600">
                                  distinct
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-gray-400">
                                {stat.compare.distinct}
                                <span className="ml-1 font-sans text-xs text-gray-600">
                                  distinct
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <DeltaBadge value={delta} />
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
                            className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-gray-300">
                                {stat.column}
                              </span>
                              <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                                avg
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-gray-300">
                              {fmt(stat.primary.avg)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-gray-300">
                              {fmt(stat.compare.avg)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <DeltaBadge
                                value={delta}
                                label={`${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Small inline badge showing a delta value with color + icon */
function DeltaBadge({ value, label }: { value: number; label?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-500">
        <Minus className="h-3 w-3" />0
      </span>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? "text-emerald-400" : "text-red-400";

  const fmt = (n: number) =>
    Math.abs(n) >= 1000
      ? n.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : Math.abs(n) < 0.01
        ? n.toExponential(1)
        : n.toFixed(2);

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}
      {fmt(value)}
      {label && <span className="text-[10px] opacity-70">{label}</span>}
    </span>
  );
}
