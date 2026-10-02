# RevenueAudit AI API

The API is an Express + TypeScript service for the audit pipeline. It exposes health monitoring plus `POST /api/audit`, which validates the target URL, runs the SSRF-safe crawler, evaluates the versioned deterministic rules over the crawled evidence, and returns findings with scores derived from those findings. It does not persist data, call Gemini, or perform auto-fix.

## Run locally

From the repository root, use the workspace command when pnpm is available:

```sh
pnpm --filter @revenueaudit/api dev
```

Or run from this directory:

```sh
npm run dev
```

Copy `.env.example` to `.env` and configure the following values:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | HTTP port for the API | `3001` |
| `NODE_ENV` | `development`, `test`, or `production` | `development` |
| `FRONTEND_URL` | Single browser origin permitted by CORS | `http://localhost:5173` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, or `error` | `info` |

## Available endpoints

`GET /api/health` returns `{ "status": "ok" }` when the API process is running.

`POST /api/audit` accepts `{ "url": "https://example.com" }`, runs the real, bounded crawler, then evaluates deterministic audit rules over the crawl evidence. The response is backward-compatible: every existing crawl field (`requestedUrl`, `startedAt`, `completedAt`, `pages`, `failures`) is preserved, and the audit result is added under `audit`:

```json
{
  "requestedUrl": "https://example.com/",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "completedAt": "2026-01-01T00:00:05.000Z",
  "pages": [ /* verified crawler page evidence */ ],
  "failures": [ /* verified crawler failures */ ],
  "audit": {
    "requestedUrl": "https://example.com/",
    "generatedAt": "2026-01-01T00:00:06.000Z",
    "ruleSetVersion": "1.0.0",
    "pagesAnalyzed": 1,
    "findings": [ /* deterministic findings */ ],
    "score": { "overall": 97, "byCategory": { "SEO": 85, "Technical": 100, "Content": 100, "Links": 100, "Revenue": 100 }, "severityCounts": { "critical": 0, "high": 1, "medium": 0, "low": 0 }, "totalFindings": 1 }
  }
}
```

The crawler requires the Playwright Chromium runtime described in `workers/crawler/README.md`.

## Future architecture

The following routes are deliberately not implemented until the remaining audit pipeline exists:

- `POST /api/audits`
- `GET /api/audits/:id`
- `GET /api/audits/:id/findings`
- `GET /api/audits/:id/action-plan`

The eventual flow is React → API → secure crawl job → Playwright/Cheerio → verified crawl evidence → deterministic audit rules → Gemini explanation → database → React results.
