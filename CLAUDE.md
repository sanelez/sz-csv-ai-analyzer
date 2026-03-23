# CLAUDE.md

## Project Overview

CSV AI Analyzer — a Next.js app for analyzing CSV and Excel (.xlsx) files with AI. Includes a standalone npm package `csv-charts-ai` in `packages/csv-charts-ai/`.

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
pnpm test             # Run vitest tests (99 tests)
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
- **Package**: `csv-charts-ai` in `packages/csv-charts-ai/` — standalone npm package with AI functions, CSV parser, and React chart components
- **State**: React local state + page-level props drilling + external store for AI chat (`src/lib/chat-store.ts`)
- **File parsing**: CSV via PapaParse (`src/lib/csv-parser.ts`), XLSX via read-excel-file (`src/lib/xlsx-parser.ts`)
- **Fullscreen**: `FullscreenCard` uses CSS `position: fixed` (not portals) to preserve child component state
- **Styling**: TailwindCSS v4, dark theme, glass-morphism design

## Key Conventions

- All components are client-side (`"use client"`)
- CSV and XLSX both produce the same `CSVData` type — the rest of the app is format-agnostic
- The `csv-charts-ai` package has its own independent CSV parser (no PapaParse dependency)
- Delimiter/encoding settings only apply to CSV files; XLSX files are parsed automatically
