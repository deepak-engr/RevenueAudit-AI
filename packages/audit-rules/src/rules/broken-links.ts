import type { AuditEvidenceInput, PageEvidenceInput } from "../types.js";

export interface BrokenInternalLink {
  page: PageEvidenceInput;
  link: string;
  reason: string;
}

/**
 * Determines broken internal links using ONLY verified crawler data.
 *
 * A link is considered broken only when the crawler itself recorded evidence
 * that the target could not be served: either it appears in the crawl `failures`
 * list (navigation error, timeout, unusable response, or blocked target) or a
 * crawled page returned an error status (>= 400). Links that were never fetched
 * (for example, beyond the page budget) are deliberately NOT reported, so the
 * engine never guesses.
 */
export function detectBrokenInternalLinks(evidence: AuditEvidenceInput): BrokenInternalLink[] {
  const brokenTargets = new Map<string, string>();

  for (const failure of evidence.failures) {
    brokenTargets.set(failure.requestedUrl, failure.code);
  }

  for (const page of evidence.pages) {
    if (page.status >= 400) {
      const reason = `HTTP ${page.status}`;
      brokenTargets.set(page.finalUrl, reason);
      brokenTargets.set(page.requestedUrl, reason);
    }
  }

  const results: BrokenInternalLink[] = [];
  for (const page of evidence.pages) {
    for (const link of page.internalLinks) {
      const reason = brokenTargets.get(link);
      if (reason && link !== page.finalUrl) results.push({ page, link, reason });
    }
  }
  return results;
}
