# CLAUDE.md

## Project Overview

CSV AI Analyzer — a Next.js app for analyzing CSV and Excel (.xlsx) files with AI. The core logic lives in the standalone npm package `csv-charts-ai` in `packages/csv-charts-ai/`.

## Commands

```bash
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build (Next.js)
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix lint + prettier issues
pnpm typecheck        # TypeScript type checking (tsc --noEmit)

# Package (csv-charts-ai)
cd packages/csv-charts-ai
pnpm build            # Build package with tsup
pnpm test             # Run vitest tests (108 tests)
pnpm test:watch       # Run tests in watch mode
```

## Before Committing

Always run before committing to catch issues early:

```bash
pnpm lint             # Must pass with 0 errors
pnpm build            # Must compile successfully (includes TypeScript check)
```

The project uses prettier via eslint (`prettier/prettier` rule). Use `pnpm lint:fix` to auto-format.

## Architecture

- **App**: Next.js 16 (App Router) in `src/`
- **Package** (`csv-charts-ai`): The "brain" of the project — bundles all AI SDKs (`ai`, `zod`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`), `read-excel-file`, CSV/XLSX parsing, data diff, data summary, and React chart components. Only `react`, `recharts`, and `lucide-react` remain as optional peer deps.
- **State**: React local state + page-level props drilling + external store for AI chat (`src/lib/chat-store.ts`)
- **File parsing**: App uses PapaParse for CSV (`src/lib/csv-parser.ts`) and delegates to the package for XLSX. The package has its own zero-dep CSV parser.
- **AI service**: `src/lib/ai-service.ts` is a thin bridge that converts app settings to the package's `createAppModel()` and delegates all AI logic to the package.
- **Fullscreen**: `FullscreenCard` uses CSS `position: fixed` (not portals) to preserve child component state
- **Styling**: TailwindCSS v4, dark theme, glass-morphism design

## Key Conventions

- All components are client-side (`"use client"`)
- CSV and XLSX both produce the same `CSVData` type (structurally identical to the package's `TabularData`) — the rest of the app is format-agnostic
- The `csv-charts-ai` package is the central library: AI functions, model resolution, CSV diff, data summary, chart components all live there
- App-specific concerns (cookie storage, PapaParse parsing, chat state, UI components) stay in `src/lib/`
- Delimiter/encoding settings only apply to CSV files; XLSX files are parsed automatically
