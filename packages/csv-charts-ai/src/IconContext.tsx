import { createContext, useContext } from "react";

// ============ Icon Types ============

/** Props accepted by every chart icon component. */
export interface ChartIconProps {
  className?: string;
}

/** A React component that renders an icon. */
export type ChartIcon = React.ComponentType<ChartIconProps>;

/** The full set of icons used by chart components. */
export interface ChartIconSet {
  RefreshCw: ChartIcon;
  Download: ChartIcon;
  SortAsc: ChartIcon;
  SortDesc: ChartIcon;
  RotateCcw: ChartIcon;
  TrendingUp: ChartIcon;
  Filter: ChartIcon;
  ImageIcon: ChartIcon;
}

// ============ Default SVG Icons ============
// Minimal stroke-based 24×24 icons (same style as lucide-react).
// No external dependency required.

const svgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function DefaultRefreshCw({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function DefaultDownload({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function DefaultSortAsc({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <line x1="12" y1="20" x2="12" y2="4" />
      <polyline points="6 10 12 4 18 10" />
    </svg>
  );
}

function DefaultSortDesc({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <line x1="12" y1="4" x2="12" y2="20" />
      <polyline points="18 14 12 20 6 14" />
    </svg>
  );
}

function DefaultRotateCcw({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function DefaultTrendingUp({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function DefaultFilter({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function DefaultImageIcon({ className }: ChartIconProps) {
  return (
    <svg {...svgProps} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ============ Default Icon Set ============

export const defaultIcons: ChartIconSet = {
  RefreshCw: DefaultRefreshCw,
  Download: DefaultDownload,
  SortAsc: DefaultSortAsc,
  SortDesc: DefaultSortDesc,
  RotateCcw: DefaultRotateCcw,
  TrendingUp: DefaultTrendingUp,
  Filter: DefaultFilter,
  ImageIcon: DefaultImageIcon,
};

// ============ Context ============

const ChartIconContext = createContext<ChartIconSet>(defaultIcons);

/**
 * Provide a custom icon set to chart components.
 *
 * @example
 * ```tsx
 * import { ChartIconProvider } from "csv-charts-ai/charts";
 * import { RefreshCw, Download, ... } from "lucide-react";
 *
 * const lucideIcons = { RefreshCw, Download, SortAsc, SortDesc, RotateCcw, TrendingUp, Filter, ImageIcon: Image };
 *
 * <ChartIconProvider icons={lucideIcons}>
 *   <ChartDisplay data={data} charts={charts} />
 * </ChartIconProvider>
 * ```
 */
export function ChartIconProvider({
  icons,
  children,
}: {
  icons: Partial<ChartIconSet>;
  children: React.ReactNode;
}) {
  const merged = { ...defaultIcons, ...icons };
  return (
    <ChartIconContext.Provider value={merged}>
      {children}
    </ChartIconContext.Provider>
  );
}

/** Get the current icon set from context. */
export function useChartIcons(): ChartIconSet {
  return useContext(ChartIconContext);
}
