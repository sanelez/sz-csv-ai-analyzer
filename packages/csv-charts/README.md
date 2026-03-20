# @maxgfr/csv-charts

Reusable chart components for CSV/tabular data visualization, powered by [Recharts](https://recharts.org/).

## Installation

```bash
npm install @maxgfr/csv-charts
# or
pnpm add @maxgfr/csv-charts
```

### Peer Dependencies

```bash
npm install react recharts lucide-react
```

## Usage

```tsx
import { ChartDisplay, type TabularData, type ChartConfig } from "@maxgfr/csv-charts";

const data: TabularData = {
  headers: ["Category", "Sales"],
  rows: [
    ["Electronics", "1200"],
    ["Clothing", "800"],
    ["Food", "950"],
  ],
  columns: [
    { name: "Category", type: "string", index: 0 },
    { name: "Sales", type: "number", index: 1 },
  ],
  rowCount: 3,
};

const charts: ChartConfig[] = [
  {
    id: "chart-1",
    type: "bar",
    title: "Sales by Category",
    description: "Comparison of sales across categories",
    xAxis: "Category",
    yAxis: "Sales",
    aggregation: "sum",
  },
];

function App() {
  return <ChartDisplay data={data} charts={charts} />;
}
```

## Components

### `ChartDisplay`

Main component that renders multiple charts from configuration.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `TabularData` | The tabular data to visualize |
| `charts` | `ChartConfig[]` | Array of chart configurations |
| `onRegenerate` | `(chart: ChartConfig) => Promise<void>` | Optional callback for chart regeneration |
| `cardWrapper` | `React.ComponentType` | Optional wrapper component for each chart card |

### `SingleChart`

Renders an individual chart with toolbar controls (sort, zoom, trendline, export).

### `ChartToolbar`

Toolbar component with sort, filter, zoom, trendline, and export controls.

### `processChartData`

Utility function that processes `TabularData` into chart-ready data points with aggregation support.

## Chart Types

- **bar** — Category comparisons
- **line** — Trends over time
- **area** — Cumulative trends
- **scatter** — Correlations
- **pie** — Proportional distributions

## Aggregation Types

`sum` | `avg` | `count` | `min` | `max` | `none`

## License

MIT
