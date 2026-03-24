# 📊 CSV AI Analyzer

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://maxgfr.github.io/csv-ai-analyzer)
[![Next.js](https://img.shields.io/badge/Next.js-black.svg)](https://nextjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38bdf8.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)
[![npm](https://img.shields.io/npm/v/csv-charts-ai.svg)](https://www.npmjs.com/package/csv-charts-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚀 **[Try it live →](https://maxgfr.github.io/csv-ai-analyzer)**

App preview:

![CSV AI Analyzer preview](.github/assets/app.gif)

A modern, elegant application to analyze your CSV and Excel (.xlsx) files with Artificial Intelligence using multiple AI providers (OpenAI, Anthropic, Google, Mistral, and more). **Privacy-first**: the app does not store your data. Use a self-hosted/custom endpoint to keep processing entirely local; otherwise API calls go to the selected provider. **Self-hostable** with Docker.

## ✨ Features

### 📁 File Upload & Parsing
- **Drag & Drop** or file selection — supports **CSV** and **Excel (.xlsx)** files
- **Automatic detection** of delimiters (comma, semicolon, tab) for CSV files
- **Configurable settings**: delimiter, header row, encoding
- **Type inference** for columns (text, number, date)

### 📋 Data Visualization
- **Interactive table** with sorting and pagination
- **Data preview** with automatic formatting
- **Smooth navigation** for large datasets

### 🤖 AI-Powered Analysis
- **Multiple AI providers**: OpenAI, Anthropic Claude, Google Gemini, Mistral, and more
- **Custom endpoint support**: Connect to Ollama, LM Studio, vLLM, or any OpenAI-compatible API
- **Intelligent analysis** of your data with AI-generated insights
- **Markdown rendering**: AI responses rendered with full Markdown support (headings, lists, tables, syntax-highlighted code blocks)
- **Streaming with Markdown**: Real-time streaming responses are rendered progressively as formatted Markdown
- **Smart chart suggestions** tailored to your dataset
- **Chart types**: Bar, Line, Pie, Scatter, Area

### 🔒 Privacy
- **Local or direct-to-provider**: the app does not store your data. Processing can happen in your browser when using a self-hosted/custom endpoint; otherwise API calls go directly to the chosen AI provider.
- **API keys stored locally** in your browser
- **No tracking** or third-party cookies

### 🐳 Self-Hostable
- **Docker ready**: Deploy in seconds with a single command
- **Custom AI endpoints**: Use your own LLM server (Ollama, LM Studio, vLLM, etc.)
- **Full control**: Host on your own infrastructure

## 🚀 Installation

### Option 1: Local Development

```bash
# Clone the repo
git clone https://github.com/maxgfr/csv-ai-analyzer.git
cd csv-ai-analyzer

# Install dependencies
pnpm install

# Run in development
pnpm dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000)

### Auto-updating the models catalog

This project ships a static `public/models.json` that contains the models catalog fetched from `https://models.dev/api.json`.

- You can regenerate the file locally with:

```bash
pnpm run fetch-models
```

- A GitHub Action is configured to run this script once per day and automatically commit `public/models.json` if it changes.

  - Workflow: `.github/workflows/update-models.yml`
  - Runs daily (UTC 06:00) and is also triggerable manually with `workflow_dispatch`.

If you'd like the file to be refreshed more/less often you can update the cron schedule in the workflow file.

### Option 2: Docker (Self-Hosting)

```bash
# Build the Docker image
docker build -t csv-ai-analyzer .

# Run the container
docker run -p 3000:3000 csv-ai-analyzer
```

Or use Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  csv-ai-analyzer:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

```bash
docker compose up -d
```

The application will be accessible at [http://localhost:3000](http://localhost:3000)

Or use the **[live version](https://maxgfr.github.io/csv-ai-analyzer)** directly!

## 🎮 Usage

### 1. Upload a File

Drag and drop your CSV or Excel (.xlsx) file, or click to select a file.

### 2. Configure Parsing (Optional)

If automatic detection doesn't work perfectly, adjust the settings:

- Custom delimiter
- Header row choice
- File encoding

### 3. Configure your AI Provider

Click the ⚙️ icon to configure your AI provider:

- **Choose a provider**: OpenAI, Anthropic, Google, Mistral, or others
- **Enter your API key**: Each provider has its own API key format
- **Custom Endpoint**: Enable "Use Custom Endpoint" to connect to local/self-hosted OpenAI-compatible APIs (Ollama, LM Studio, vLLM, etc.)

#### Using Custom Endpoints (Ollama, LM Studio, vLLM, etc.)

1. Toggle "Use Custom Endpoint" in settings
2. Enter your API Base URL (e.g., `http://localhost:11434/v1` for Ollama)
3. Enter your model name (e.g., `llama3.2`, `mistral`, `codellama`)
4. API key is optional for most local servers

**Example configurations:**

| Provider | Base URL | Model Examples |
|----------|----------|----------------|
| Ollama | `http://localhost:11434/v1` | `llama3.2`, `mistral`, `codellama` |
| LM Studio | `http://localhost:1234/v1` | Model name from LM Studio |
| vLLM | `http://localhost:8000/v1` | Your loaded model name |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o`, `anthropic/claude-3` |

### 4. Analysis & Charts

Click "Run Complete Analysis" and the AI will analyze your data, detect anomalies, and suggest relevant visualizations.

## 📦 `csv-charts-ai` — Standalone Library

The core of this project is published as a standalone npm package [`csv-charts-ai`](https://www.npmjs.com/package/csv-charts-ai) — a full-featured library for AI-powered CSV analysis, chart generation, and interactive visualization. It works with **any LLM provider** (OpenAI, Anthropic, Google, Mistral, Ollama, or any OpenAI-compatible endpoint).

Use it in React apps, Node.js scripts, APIs, or CLI tools.

### Installation

```bash
pnpm add csv-charts-ai
```

All AI SDKs and utilities are bundled. **Optional peer dependencies** (for React chart components only): `react`, `recharts`, `lucide-react`.

### Quick Start — Full AI Analysis

```ts
import { parseCSV, analyzeData } from "csv-charts-ai";

// 1. Parse any CSV string (auto-detects delimiter, infers types)
const data = parseCSV(csvString);

// 2. Run full analysis: summary + anomalies + charts in parallel
const result = await analyzeData({
  model: { apiKey: "sk-...", model: "gpt-4o" },
  data,
});

console.log(result.summary.keyInsights);
console.log(`Found ${result.anomalies.length} anomalies`);
console.log(`Generated ${result.charts.length} chart suggestions`);
```

### React Components

Chart components live in a separate entry point (`csv-charts-ai/charts`) so the core stays React-free:

```tsx
import { ChartDisplay, defaultDarkTheme } from "csv-charts-ai/charts";

// Display AI-generated charts with interactive toolbar (zoom, sort, trendline, export)
<ChartDisplay data={data} charts={charts} theme={defaultDarkTheme} />

// Unstyled mode — strip all Tailwind classes and style it yourself
<ChartDisplay data={data} charts={charts} unstyled className="my-charts" />
```

### Multi-Provider Support

```ts
// OpenAI (default)
{ apiKey: "sk-...", model: "gpt-4o" }

// Anthropic
{ apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514", provider: "anthropic" }

// Google Gemini
{ apiKey: "...", model: "gemini-2.5-flash", provider: "google" }

// Ollama / vLLM / LM Studio (local)
{ apiKey: "", model: "llama3", baseURL: "http://localhost:11434/v1" }

// Any Vercel AI SDK LanguageModel instance
import { anthropic } from "@ai-sdk/anthropic";
suggestCharts({ model: anthropic("claude-sonnet-4-20250514"), data });
```

### AI Functions Reference

| Function | Description |
|----------|-------------|
| `analyzeData()` | Full pipeline: summary + anomalies + charts in parallel |
| `suggestCharts()` | Generate 2–4 chart suggestions from data |
| `suggestCustomChart()` | Generate a single chart from a text prompt |
| `repairChart()` | Fix a chart config that failed to render |
| `summarizeData()` | AI-generated data summary with key insights |
| `detectAnomalies()` | Find outliers, missing values, type mismatches |
| `askAboutData()` | Ask natural-language questions about data |
| `streamAskAboutData()` | Streaming version with `onChunk` callback |
| `suggestQuestions()` | Suggest interesting questions to ask about the data |

### React Components Reference (`csv-charts-ai/charts`)

| Component | Description |
|-----------|-------------|
| `ChartDisplay` | Multi-chart container with optional card wrapper and theme |
| `SingleChart` | Individual chart with toolbar (sort, zoom, trendline, CSV/PNG export) |
| `ChartToolbar` | Standalone toolbar component |
| `ChartThemeProvider` | React context for chart theming |
| `defaultDarkTheme` / `defaultLightTheme` | Built-in themes |

### Utilities Reference

| Utility | Description |
|---------|-------------|
| `parseCSV(csv, options?)` | Parse CSV string into `TabularData` with auto-delimiter detection |
| `parseXLSX(file, options?)` | Parse XLSX file into `TabularData` (browser) |
| `computeDiff(dataA, dataB, options)` | Compare two datasets (index, key, or content matching) |
| `generateDataSummary(data)` | Detailed human-readable data summary |
| `createModel()` / `createAppModel()` | Create a `LanguageModel` from config |
| `processChartData()` | Process and aggregate chart data |
| `COLORS` | Default 8-color palette |

Chart types: `bar`, `line`, `area`, `scatter`, `pie`. Aggregations: `sum`, `avg`, `count`, `min`, `max`, `none`. Multi-series supported via `groupBy`.

See the full documentation with all options and examples in [`packages/csv-charts-ai/README.md`](packages/csv-charts-ai/README.md).

## 🛠️ Tech Stack

| Technology | Usage |
|-------------|-------|
| **Next.js** | React Framework with App Router |
| **TailwindCSS** | Styling and design system |
| **PapaParse** | Client-side CSV parsing |
| **read-excel-file** | Lightweight XLSX parsing (~35 KB) |
| **Recharts** | React charting library |
| **react-markdown** | Markdown rendering for AI responses |
| **rehype-highlight** | Syntax highlighting in code blocks |
| **Lucide React** | Modern icons |
| **js-cookie** | Secure local persistence |
| **tsup** | Package bundling for `csv-charts-ai` |
| **semantic-release** | Automated npm publishing via CI |

## 📁 Project Structure

```
csv-ai-analyzer/
├── src/                          # Next.js application
│   ├── app/_components/          # React components
│   ├── lib/                      # Services, parsers, stores
│   └── styles/                   # Global CSS
├── packages/
│   └── csv-charts-ai/            # csv-charts-ai npm package
│       ├── src/                   # Package source (ChartDisplay, SingleChart, etc.)
│       ├── dist/                  # Built output (ESM + .d.ts)
│       └── package.json
├── pnpm-workspace.yaml           # Monorepo workspace config
└── package.json                  # Root app
```

## 📝 License

MIT - Use as you wish!
