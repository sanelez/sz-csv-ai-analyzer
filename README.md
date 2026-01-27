# 📊 CSV AI Analyzer

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://maxgfr.github.io/csv-ai-analyzer)
[![Next.js](https://img.shields.io/badge/Next.js-black.svg)](https://nextjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38bdf8.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚀 **[Try it live →](https://maxgfr.github.io/csv-ai-analyzer)**

App preview:

![CSV AI Analyzer preview](.github/assets/app.gif)

A modern, elegant application to analyze your CSV files with Artificial Intelligence using multiple AI providers (OpenAI, Anthropic, Google, Mistral, and more). **Privacy-first**: the app does not store your data. Use a self-hosted/custom endpoint to keep processing entirely local; otherwise API calls go to the selected provider. **Self-hostable** with Docker.

## ✨ Features

### 📁 CSV Upload & Parsing
- **Drag & Drop** or file selection
- **Automatic detection** of delimiters (comma, semicolon, tab)
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

### 1. Upload a CSV

Drag and drop your CSV file or click to select a file.

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

## 🛠️ Tech Stack

| Technology | Usage |
|-------------|-------|
| **Next.js** | React Framework with App Router |
| **TailwindCSS** | Styling and design system |
| **PapaParse** | Client-side CSV parsing |
| **Recharts** | React charting library |
| **Lucide React** | Modern icons |
| **js-cookie** | Secure local persistence |

## 📝 License

MIT - Use as you wish!
