import { COMMERCIAL_PATH_KEYWORDS, RULE_VERSION } from "../constants.js";
import type { AuditRule, PageEvidenceInput, RuleFindingInput } from "../types.js";
import { textLength, urlOf } from "./helpers.js";

function matchesCommercialPath(link: string): boolean {
  try {
    const url = new URL(link);
    const path = `${url.pathname}${url.search}`.toLowerCase();
    return COMMERCIAL_PATH_KEYWORDS.some((keyword) => path.includes(keyword));
  } catch {
    return false;
  }
}

/**
 * Revenue / CRO rules.
 *
 * These only ever raise an *opportunity* that is objectively countable in
 * crawler output (a missing mobile viewport, or the absence of any discovered
 * commercial/contact pathway). They never claim a monetary loss, a conversion
 * rate, or any revenue figure, because the crawler does not measure those.
 */
export const revenueRules: AuditRule[] = [
  {
    id: "revenue/missing-viewport",
    version: RULE_VERSION,
    category: "Revenue",
    evaluate: (evidence): RuleFindingInput[] => {
      const primary: PageEvidenceInput | undefined = evidence.pages[0];
      if (!primary || textLength(primary.viewport) > 0) return [];
      return [
        {
          severity: "medium",
          title: "Primary page has no mobile viewport configuration",
          description:
            "The crawler found no viewport meta tag on the primary page. Without it, mobile browsers render a desktop layout, which is a measurable obstacle to mobile visitors.",
          evidence: {
            summary: "Crawler recorded no viewport meta tag on the primary page.",
            data: { url: urlOf(primary), viewport: primary.viewport },
          },
          impact: "high",
          effort: "low",
          recommendation: "Add a responsive viewport meta tag so the page adapts to mobile screens.",
          affectedUrl: urlOf(primary),
        },
      ];
    },
  },
  {
    id: "revenue/no-commercial-pathway",
    version: RULE_VERSION,
    category: "Revenue",
    evaluate: (evidence): RuleFindingInput[] => {
      const internalLinks = new Set<string>();
      for (const page of evidence.pages) for (const link of page.internalLinks) internalLinks.add(link);
      if (internalLinks.size === 0) return [];

      const matched = [...internalLinks].filter(matchesCommercialPath);
      if (matched.length > 0) return [];

      return [
        {
          severity: "medium",
          title: "No clear commercial or contact pathway detected",
          description: `The crawl discovered ${internalLinks.size} internal link(s) but none pointed at a recognisable commercial or contact path (such as pricing, product, cart, checkout, signup, demo, or contact). This is an observation about discovered links only; no revenue or conversion impact is assumed.`,
          evidence: {
            summary: "No internal link matched the commercial-pathway keyword set.",
            data: {
              url: evidence.requestedUrl,
              internalLinksAnalyzed: internalLinks.size,
              matchedKeywords: matched,
              keywords: [...COMMERCIAL_PATH_KEYWORDS],
            },
          },
          impact: "high",
          effort: "medium",
          recommendation: "Confirm a clear pathway to purchase, enquiry, or signup exists and is linked from key pages.",
          affectedUrl: evidence.requestedUrl,
        },
      ];
    },
  },
];
