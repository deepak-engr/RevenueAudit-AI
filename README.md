# RevenueAudit AI

AI-powered website audit and growth intelligence platform.

RevenueAudit AI follows one principle above all others: observed crawler evidence and deterministic audit rules are the source of truth. AI will eventually explain verified findings; it will not invent facts, scores, or crawl results.

## Repository layout

- `apps/web` — React, Vite, TypeScript, and Tailwind application shell.
- `apps/api` — Express API exposing `GET /api/health` and `POST /api/audit`.
- `packages/shared` — shared TypeScript contracts and validation schemas.
- `packages/audit-rules` — versioned deterministic rules that turn verified crawler evidence into findings and derived scores.
- `workers/crawler` — SSRF-safe Playwright/Cheerio worker that gathers verified page evidence only.
- `database` — reserved for future Supabase SQL migrations.
- `docs/architecture` — architecture and implementation guidance.

## Prerequisites

- Node.js 22 or later
- pnpm 10 (Corepack is supported)

## Setup

```bash
corepack enable
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
pnpm dev
```

On macOS/Linux, replace the PowerShell copy command with `cp apps/api/.env.example apps/api/.env`.

On Windows, `corepack enable` writes its shims next to the Node.js installation and fails with `EPERM` unless the shell is elevated. Install the shims into a user-writable directory that is already on `PATH` instead:

```powershell
corepack enable --install-directory "$env:APPDATA\npm"
```

The web app starts on `http://localhost:5173` and the API on `http://localhost:3001`. Check the API with `GET /api/health`.

## Quality commands

```bash
pnpm type-check
pnpm build
pnpm test
```

Crawling and deterministic auditing are implemented: `POST /api/audit` validates the target URL, runs the SSRF-safe crawler, evaluates the versioned rules over the crawl evidence, and returns findings with scores derived from those findings. Gemini explanations, Supabase persistence, authentication, payments, and auto-fix are not implemented yet.
