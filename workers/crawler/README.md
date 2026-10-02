# Crawler worker

This worker performs bounded, evidence-only crawls with Playwright and Cheerio. It validates the initial URL and every document navigation (including redirects), resolves hostnames before allowing navigation, blocks private/loopback/link-local/internal targets, aborts non-document resources, deduplicates normalized URLs, and applies page, timeout, and HTML-size limits.

It does not bypass authentication, paywalls, robots/security controls, or access restrictions. It collects only publicly reachable document evidence; it does not score, recommend, or persist anything.

Install the Playwright Chromium runtime once in a deployment environment:

```sh
pnpm --filter @revenueaudit/crawler-worker exec playwright install chromium
```
