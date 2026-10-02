# Services

Audit orchestration lives here. `audit-service.ts` runs the SSRF-safe crawler
(`@revenueaudit/crawler-worker`) and passes its verified evidence through the
deterministic audit engine (`@revenueaudit/audit-rules`), returning the crawl
evidence plus findings and scores. No scoring or facts are invented here; the
crawler remains the only source of website evidence.
