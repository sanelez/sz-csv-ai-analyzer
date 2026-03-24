# csv-charts-ai

AI-powered CSV analysis, chart generation, and interactive visualization. Built on the [Vercel AI SDK](https://sdk.vercel.ai/) and [Recharts](https://recharts.org/).

**Works with any LLM provider** — OpenAI, Anthropic, Google, Mistral, Ollama, or any OpenAI-compatible endpoint.

## Installation

```bash
pnpm add csv-charts-ai
```

All AI SDKs (`ai`, `zod`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`) and `read-excel-file` are bundled — no extra installs needed.

**Optional peer dependencies** (only for React chart components): `react`, `recharts`, `lucide-react`.

## Quick Start

```ts
import { parseCSV, analyzeData, suggestQuestions } from "csv-charts-ai";

// 1. Parse CSV string into structured data
const data = parseCSV(`name,age,city,salary
Alice,30,Paris,75000
Bob,25,London,62000
Charlie,35,Berlin,88000`);

// 2. Run full AI analysis (summary + anomalies + charts) in parallel
const result = await analyzeData({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
});

console.log(result.summary.keyInsights);
console.log(`Found ${result.anomalies.length} anomalies`);
console.log(`Generated ${result.charts.length} chart suggestions`);

// 3. Suggest questions the user could ask
const questions = await suggestQuestions({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
});
questions.forEach(q => console.log(`[${q.category}] ${q.question}`));
```

## CSV Parsing

Parse CSV strings into the `TabularData` format with automatic delimiter detection and column type inference.

```ts
import { parseCSV } from "csv-charts-ai";

// Auto-detects delimiter (comma, semicolon, tab, pipe)
const data = parseCSV(csvString);

// Explicit options
const data = parseCSV(csvString, {
  delimiter: ";",
  hasHeader: true,
  skipEmpty: true,
});

console.log(data.headers);   // ["name", "age", "city"]
console.log(data.rowCount);  // 100
console.log(data.columns);   // [{ name: "name", type: "string", index: 0 }, ...]
```

**Type inference** detects `string`, `number`, `date`, and `boolean` columns by sampling values. Handles quoted fields, escaped quotes, multi-line values, and BOM stripping (RFC 4180).

> For very large files or exotic encodings, consider using [PapaParse](https://www.papaparse.com/) and passing the result as `TabularData` directly.

## XLSX Parsing

Parse Excel (.xlsx) files into the same `TabularData` format. `read-excel-file` is bundled.

### Browser

```ts
import { parseXLSX } from "csv-charts-ai";

const data = await parseXLSX(file); // File from <input> or drag-and-drop
console.log(data.headers, data.rowCount);
```

### Node.js / Universal

Use `convertXLSXRows` with any XLSX reader — it takes raw row arrays and has zero dependencies:

```ts
import readXlsxFile from "read-excel-file/node";
import { convertXLSXRows } from "csv-charts-ai";

const rows = await readXlsxFile("data.xlsx");
const data = convertXLSXRows(rows);
```

Options: `{ hasHeader?: boolean, skipEmpty?: boolean }` — same defaults as `parseCSV`.

## AI Functions

All AI functions accept either a simple config object or a pre-built `LanguageModel` from the Vercel AI SDK. All support an optional `signal` (AbortSignal) for cancellation.

### Chart Suggestions

```ts
import { suggestCharts } from "csv-charts-ai";

// Simple — OpenAI
const charts = await suggestCharts({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
});

// Custom endpoint — Ollama / vLLM / LM Studio
const charts = await suggestCharts({
  model: { apiKey: "", model: "llama3", baseURL: "http://localhost:11434/v1" },
  data,
});

// Other providers — Anthropic, Google, Mistral
const charts = await suggestCharts({
  model: { apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514", provider: "anthropic" },
  data,
});

// Advanced — any LanguageModel instance
import { anthropic } from "@ai-sdk/anthropic";
const charts = await suggestCharts({
  model: anthropic("claude-sonnet-4-20250514"),
  data,
  language: "French",
});
```

### Custom Chart from Prompt

```ts
import { suggestCustomChart } from "csv-charts-ai";

const chart = await suggestCustomChart({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  prompt: "Show me a bar chart of revenue by category",
});
```

### Repair a Broken Chart

```ts
import { repairChart } from "csv-charts-ai";

const fixed = await repairChart({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  failedChart: brokenChart,
  columns: ["name", "sales", "date"],
  errorContext: "Column 'revenue' does not exist",
});
```

### Data Summary

```ts
import { summarizeData } from "csv-charts-ai";

const result = await summarizeData({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
});

console.log(result.summary);      // "This dataset contains sales records..."
console.log(result.keyInsights);   // ["Revenue peaks in Q4", "Product A leads..."]
console.log(result.dataQuality);   // "Good completeness, 2 missing values in..."
```

### Anomaly Detection

```ts
import { detectAnomalies } from "csv-charts-ai";

const anomalies = await detectAnomalies({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  maxRows: 100, // default: 50
});

anomalies.forEach(a =>
  console.log(`[${a.severity}] Row ${a.row}, ${a.column}: ${a.issue}`)
);
```

### Ask Questions About Data

```ts
import { askAboutData, streamAskAboutData } from "csv-charts-ai";

// Non-streaming
const answer = await askAboutData({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  question: "What is the average revenue by region?",
  history: [{ prompt: "How many rows?", response: "There are 1000 rows." }],
});

// Streaming
await streamAskAboutData({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  question: "What trends do you see?",
  onChunk: (chunk) => process.stdout.write(chunk),
  onComplete: (full) => console.log("\nDone:", full.length, "chars"),
});
```

### Suggest Questions

```ts
import { suggestQuestions } from "csv-charts-ai";

const questions = await suggestQuestions({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  count: 5,
});

questions.forEach(q => console.log(`[${q.category}] ${q.question}`));
// [trend] How has revenue changed month over month?
// [comparison] Which region has the highest average order value?
// [correlation] Is there a relationship between marketing spend and sales?
```

### Full Analysis Pipeline

Runs summary, anomaly detection, and chart suggestions in parallel:

```ts
import { analyzeData } from "csv-charts-ai";

const result = await analyzeData({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  detectAnomalies: true,  // default: true
  suggestCharts: true,    // default: true
});

// result.summary   — DataSummaryResult
// result.anomalies — AnomalyResult[]
// result.charts    — ChartConfig[]
```

## Cancellation (AbortSignal)

All AI functions support `signal` for cancellation — essential for React cleanup and timeouts:

```ts
const controller = new AbortController();

const charts = await suggestCharts({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
  signal: controller.signal,
});

// Cancel from elsewhere
controller.abort();
```

React example:

```tsx
useEffect(() => {
  const controller = new AbortController();
  analyzeData({ model, data, signal: controller.signal })
    .then(setResult)
    .catch(() => {});
  return () => controller.abort();
}, [data]);
```

## React Components

> **Requires** `react`, `recharts`, `lucide-react`, and **Tailwind CSS** for styling.

### Display Charts

```tsx
import { ChartDisplay } from "csv-charts-ai";

<ChartDisplay data={data} charts={charts} />
```

### With Theme

```tsx
import { ChartDisplay, defaultLightTheme } from "csv-charts-ai";

<ChartDisplay data={data} charts={charts} theme={defaultLightTheme} />
```

### Custom Card Wrapper

```tsx
<ChartDisplay
  data={data}
  charts={charts}
  cardWrapper={({ children, title }) => (
    <div className="my-card">
      <h2>{title}</h2>
      {children}
    </div>
  )}
  onRegenerate={async (chart) => {
    const fixed = await repairChart({ model, failedChart: chart, columns: data.headers, errorContext: "Rendering failed" });
    // update state with fixed chart
  }}
/>
```

### Unstyled Mode (No Tailwind Required)

Pass `unstyled` to strip all built-in Tailwind classes and style components yourself:

```tsx
<ChartDisplay
  data={data}
  charts={charts}
  unstyled
  className="my-charts-container"
  chartClassName="my-chart-card"
  titleClassName="my-chart-title"
/>
```

You can also pass `className` to any component to add classes alongside the built-in ones:

```tsx
<ChartDisplay data={data} charts={charts} className="my-extra-class" />
```

### Headless Usage (No React)

The AI functions and CSV parsing work without React — use them in Node.js scripts, APIs, or CLI tools:

```ts
import { parseCSV, analyzeData } from "csv-charts-ai";
import { readFileSync } from "fs";

const csv = readFileSync("sales.csv", "utf-8");
const data = parseCSV(csv);

const result = await analyzeData({
  model: { apiKey: process.env.OPENAI_API_KEY!, model: "gpt-4o" },
  data,
});

console.log(result.summary.keyInsights);
```

## Components Reference

| Export | Description |
|--------|-------------|
| `ChartDisplay` | Multi-chart container with optional card wrapper and theme |
| `SingleChart` | Individual chart with toolbar (sort, zoom, trendline, CSV/PNG export) |
| `ChartToolbar` | Standalone toolbar component |
| `ChartThemeProvider` | React context for chart theming |
| `defaultDarkTheme` / `defaultLightTheme` | Built-in themes |

## AI Functions Reference

| Export | Description |
|--------|-------------|
| `suggestCharts(options)` | Generate 2-4 chart suggestions from data |
| `suggestCustomChart(options)` | Generate a single chart from a text prompt |
| `repairChart(options)` | Fix a chart config that failed to render |
| `summarizeData(options)` | AI-generated data summary with key insights |
| `detectAnomalies(options)` | Find outliers, missing values, type mismatches |
| `askAboutData(options)` | Ask natural language questions about data |
| `streamAskAboutData(options)` | Streaming version of askAboutData |
| `suggestQuestions(options)` | Suggest interesting questions to ask about the data |
| `analyzeData(options)` | Full pipeline: summary + anomalies + charts in parallel |

## Utilities Reference

| Export | Description |
|--------|-------------|
| `parseCSV(csv, options?)` | Parse CSV string into `TabularData` |
| `parseXLSX(file, options?)` | Parse XLSX file into `TabularData` (browser) |
| `convertXLSXRows(rows, options?)` | Convert raw XLSX rows into `TabularData` (universal) |
| `computeDiff(dataA, dataB, options)` | Compare two datasets (index, key, or content matching) |
| `createModel(config)` | Create a LanguageModel from an AIConfig |
| `createAppModel(config)` | Create a LanguageModel from multi-provider app config |
| `resolveModel(input)` | Resolve AIConfig, AppModelConfig, or LanguageModel |
| `generateDataSummary(data)` | Detailed human-readable data summary with sample rows |
| `summarizeTabularData(data)` | Compact data summary for AI prompt consumption |
| `getAIErrorMessage(error)` | Extract user-friendly error messages |
| `processChartData(data, chart)` | Process and aggregate chart data |
| `processChartDataMultiSeries(data, chart)` | Multi-series data processing |
| `COLORS` | Default 8-color palette |

## Validation Schemas

| Export | Description |
|--------|-------------|
| `AIConfigSchema` | Zod schema for validating AI config objects |
| `TabularDataSchema` | Zod schema for validating TabularData input |

## Chart Types

`bar` | `line` | `area` | `scatter` | `pie`

Multi-series supported via `groupBy` for bar, line, and area charts.

## Aggregation Types

`sum` | `avg` | `count` | `min` | `max` | `none`

## CSV Diff

Compare two datasets and detect added, removed, and changed rows:

```ts
import { computeDiff } from "csv-charts-ai";

const diff = computeDiff(dataA, dataB, { matchMode: "key", keyColumn: "id" });

console.log(diff.counts); // { same: 10, changed: 3, added: 2, removed: 1 }
diff.rows.forEach(r => {
  if (r.status === "changed") {
    console.log(`Row ${r.indexA}: changed columns: ${[...r.changedCols].join(", ")}`);
  }
});
```

Match modes: `"index"` (positional), `"key"` (by column value), `"content"` (full row match).

## Provider Support

All provider SDKs are bundled — no extra installs needed.

| Provider | Config |
|----------|--------|
| OpenAI | `{ apiKey, model }` |
| Anthropic | `{ provider: "anthropic", apiKey, model }` |
| Google | `{ provider: "google", apiKey, model }` |
| Mistral | `{ provider: "mistral", apiKey, model }` |
| Ollama / vLLM / LM Studio | `{ apiKey: "", model, baseURL }` |
| Any LanguageModel | Pass instance directly |

## License

MIT
