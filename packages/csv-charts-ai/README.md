# csv-charts-ai

AI-powered chart generation and visualization for tabular data, built on [Recharts](https://recharts.org/) and the [Vercel AI SDK](https://sdk.vercel.ai/).

## Installation

```bash
pnpm add csv-charts-ai ai zod
```

Peer dependencies: `react`, `recharts`, `lucide-react`, `ai`, `zod`.

## AI Chart Generation

### Simple — OpenAI

```ts
import { suggestCharts } from "csv-charts-ai";

const charts = await suggestCharts({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data: myData,
  dataSummary: "10,000 rows, columns: date, category, revenue, quantity...",
});
```

### Custom endpoint — Ollama / vLLM / LM Studio

```ts
const charts = await suggestCharts({
  model: {
    apiKey: "",
    model: "llama3",
    baseURL: "http://localhost:11434/v1",
  },
  data: myData,
  dataSummary: "...",
});
```

### Other providers — Anthropic, Google, Mistral

```ts
// Dynamic import — install @ai-sdk/anthropic
const charts = await suggestCharts({
  model: { apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514", provider: "anthropic" },
  data: myData,
  dataSummary: "...",
});
```

### Advanced — any LanguageModel

```ts
import { suggestCharts } from "csv-charts-ai";
import { anthropic } from "@ai-sdk/anthropic";

const charts = await suggestCharts({
  model: anthropic("claude-sonnet-4-20250514"),
  data: myData,
  dataSummary: "...",
  language: "French",
});
```

### Generate a chart from a prompt

```ts
import { suggestCustomChart } from "csv-charts-ai";

const chart = await suggestCustomChart({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data: myData,
  dataSummary: "...",
  prompt: "Show me a bar chart of revenue by category",
});
```

### Repair a broken chart

```ts
import { repairChart } from "csv-charts-ai";

const fixed = await repairChart({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  failedChart: brokenChart,
  columns: ["name", "sales", "date"],
  errorContext: "Column 'revenue' does not exist",
});
```

## React Components

### Display charts

```tsx
import { ChartDisplay } from "csv-charts-ai";

<ChartDisplay data={data} charts={charts} />
```

### With theme

```tsx
import { ChartDisplay, defaultLightTheme } from "csv-charts-ai";

<ChartDisplay data={data} charts={charts} theme={defaultLightTheme} />
```

## Components

| Export | Description |
|--------|-------------|
| `ChartDisplay` | Multi-chart container with optional card wrapper and theme |
| `SingleChart` | Individual chart with toolbar (sort, zoom, trendline, CSV/PNG export) |
| `ChartToolbar` | Standalone toolbar component |
| `processChartData` | Data processing utility with aggregation |
| `COLORS` | Default color palette |
| `ChartThemeProvider` | React context for chart theming |
| `defaultDarkTheme` / `defaultLightTheme` | Built-in themes |

## AI Functions

| Export | Description |
|--------|-------------|
| `suggestCharts(options)` | Generate 2-4 chart suggestions from data |
| `suggestCustomChart(options)` | Generate a single chart from a text prompt |
| `repairChart(options)` | Fix a chart config that failed to render |

## Validation Schemas

| Export | Description |
|--------|-------------|
| `AIConfigSchema` | Zod schema for validating AI config objects |
| `TabularDataSchema` | Zod schema for validating tabular data input |

## Chart Types

`bar` | `line` | `area` | `scatter` | `pie`

Multi-series supported via `groupBy` for bar, line, and area charts.

## Aggregation Types

`sum` | `avg` | `count` | `min` | `max` | `none`

## Provider Support

| Provider | Config | Extra install |
|----------|--------|---------------|
| OpenAI | `{ apiKey, model }` | None (bundled) |
| Ollama / vLLM / LM Studio | `{ apiKey: "", model, baseURL }` | None |
| Mistral (via OpenAI compat) | `{ apiKey, model, baseURL: "https://api.mistral.ai/v1" }` | None |
| Anthropic | `{ provider: "anthropic", apiKey, model }` | `@ai-sdk/anthropic` |
| Google | `{ provider: "google", apiKey, model }` | `@ai-sdk/google` |
| Any LanguageModel | Pass instance directly | Provider SDK |

## License

MIT
