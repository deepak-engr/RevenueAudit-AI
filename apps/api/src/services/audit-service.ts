import { runAuditEngine, type AuditResult } from "@revenueaudit/audit-rules";
import { crawlWebsite, type CrawlResult } from "@revenueaudit/crawler-worker";

/**
 * The full report returned by `POST /api/audit`.
 *
 * All existing crawl fields (`requestedUrl`, `startedAt`, `completedAt`,
 * `pages`, `failures`) are preserved at the top level for backward
 * compatibility; the deterministic audit result is added under `audit`.
 */
export interface AuditReport extends CrawlResult {
  audit: AuditResult;
}

/**
 * Runs the existing SSRF-safe crawler and passes its verified evidence through
 * the deterministic audit engine.
 *
 * The crawler remains the single source of website facts: every finding and
 * score is derived from its output by versioned, evidence-based rules. Nothing
 * is invented here.
 */
export async function runAudit(url: string): Promise<AuditReport> {
  const crawlResult = await crawlWebsite(url);
  const audit = runAuditEngine(crawlResult);
  return { ...crawlResult, audit };
}
