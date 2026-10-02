# RevenueAudit AI architecture

## System architecture

RevenueAudit AI is a pnpm monorepo with a browser application, API, background worker, and shared packages. The web application communicates only with the API. The API will own authorization, persistence, job orchestration, and access to all server-side secrets. The crawler will run separately from the web process.

## Responsibilities

- **`apps/web`** renders the product interface and contains no secret configuration.
- **`apps/api`** exposes the product APIs. It currently serves `GET /api/health` and `POST /api/audit`.
- **`packages/shared`** provides typed contracts and validation schemas used across services.
- **`packages/audit-rules`** holds the versioned deterministic rules (24 rules spanning SEO, Technical, Content, Links, Images, and Revenue/CRO) that convert crawler evidence into findings and derived scores. It never invents facts, scores, or crawl results.
- **`workers/crawler`** runs bounded crawls with Playwright and Cheerio, blocks SSRF and private, loopback, link-local, and internal destinations, and returns verified page evidence only. It does not score, recommend, or persist.
- **`database`** will contain Supabase PostgreSQL migrations in a later phase.

## Intended data flow

1. An authenticated user requests an audit through the web application.
2. The API validates ownership, validates the target, creates a job, and delegates it to the worker.
3. The worker gathers bounded, reproducible evidence from safe public targets only.
4. Deterministic rules convert that evidence into stored findings with rule versions and evidence references.
5. Gemini may explain those verified findings. Its output is supplementary and never becomes crawl evidence or a source of facts.
6. The API serves findings and later verification/monitoring history to the web app.

## Security principles

- Secrets are server-side environment variables and are excluded from version control.
- Browser configuration may use `VITE_` variables only when the values are safe to publish.
- The future crawler must block SSRF and private or reserved network destinations, revalidate redirects and resolved addresses, and use strict resource limits.
- Authorization and tenant isolation will be enforced in the API and database row-level security policies.
- Future write integrations require explicit authorization, clear previews, user approval, least-privilege scopes, and audit trails.

## Source of truth

Crawler evidence plus deterministic audit rules are the source of truth because they are reproducible, inspectable, and testable. There are no generated audit results or arbitrary scores. Gemini will only interpret structured, verified findings and must not create, alter, or imply evidence that was not observed.

## Future phases

1. Authentication, tenants, Supabase schema, and row-level security.
2. SSRF-safe crawl-job pipeline and evidence storage.
3. Evidence-backed findings UI and prioritized action plans.
4. Gemini explanations constrained to verified findings.
5. Re-audit verification, scheduling, monitoring, notifications, and approved integrations.
