import type { TabularData, ChartConfig } from "./types";
import { SingleChart } from "./SingleChart";

export interface ChartDisplayProps {
  data: TabularData;
  charts: ChartConfig[];
  onRegenerate?: (chart: ChartConfig) => Promise<void>;
  /** Optional wrapper component for each chart card */
  cardWrapper?: React.ComponentType<{
    children: React.ReactNode;
    title?: string;
    className?: string;
  }>;
}

function DefaultCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function ChartDisplay({
  data,
  charts,
  onRegenerate,
  cardWrapper: CardWrapper = DefaultCard,
}: ChartDisplayProps) {
  if (charts.length === 0) return null;

  return (
    <div className="animate-fade-in space-y-6">
      {charts.map((chart) => (
        <CardWrapper
          key={chart.id}
          title={chart.title}
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50"
        >
          <div className="p-6">
            <h3 className="mb-2 bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-xl font-bold text-transparent">
              {chart.title}
            </h3>
            <p className="mb-4 text-gray-400">{chart.description}</p>
            <SingleChart
              data={data}
              chart={chart}
              onRegenerate={onRegenerate}
            />
          </div>
        </CardWrapper>
      ))}
    </div>
  );
}
