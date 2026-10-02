import { RULE_VERSION } from "../constants.js";
import type { AuditRule, RuleFindingInput } from "../types.js";
import { detectBrokenInternalLinks } from "./broken-links.js";
import { isNoIndex, textLength, urlOf } from "./helpers.js";

/**
 * Technical rules. These read measurable crawl facts: HTTP status, whether a
 * navigation was redirected (requested URL differs from final URL), robots meta
 * directives, canonical presence, and links the crawler itself proved broken.
 */
export const technicalRules: AuditRule[] = [
  {
    id: "technical/non-200-status",
    version: RULE_VERSION,
    category: "Technical",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        if (page.status === 200) return [];
        const severity = page.status >= 400 ? "critical" : "medium";
        return [
          {
            severity,
            title: "Page did not return a 200 status",
            description: `The crawler recorded HTTP ${page.status} for this URL. Non-200 responses either fail for visitors or require an extra request to resolve.`,
            evidence: {
              summary: `Crawler recorded HTTP status ${page.status}.`,
              data: { url: urlOf(page), requestedUrl: page.requestedUrl, status: page.status },
            },
            impact: page.status >= 400 ? "high" : "medium",
            effort: "medium",
            recommendation:
              page.status >= 400
                ? "Restore the page or redirect it to a valid replacement so visitors and crawlers do not hit an error."
                : "Confirm the redirect resolves directly to the intended final URL and update internal links to point there.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "technical/redirect-detected",
    version: RULE_VERSION,
    category: "Technical",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        if (page.requestedUrl === page.finalUrl) return [];
        return [
          {
            severity: "low",
            title: "Page was reached through a redirect",
            description:
              "The requested URL differed from the final URL, so at least one redirect was resolved during navigation. Redirect chains add latency and can spread ranking signals.",
            evidence: {
              summary: "Requested URL differs from the crawled final URL.",
              data: { requestedUrl: page.requestedUrl, finalUrl: page.finalUrl, status: page.status },
            },
            impact: "low",
            effort: "low",
            recommendation: "Link directly to the final URL and remove unnecessary redirects where practical.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "technical/robots-noindex",
    version: RULE_VERSION,
    category: "Technical",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => isNoIndex(page.robotsDirectives))
        .map((page) => ({
          severity: "high",
          title: "Robots meta tag requests no indexing",
          description:
            "The page's robots meta directives include noindex (or none), instructing search engines not to index the page. Confirm this is intentional, otherwise the page cannot be found in search.",
          evidence: {
            summary: `Crawler recorded robots directives: ${page.robotsDirectives.join(", ") || "(none)"}.`,
            data: { url: urlOf(page), robotsDirectives: page.robotsDirectives },
          },
          impact: "high",
          effort: "low",
          recommendation: "Remove the noindex directive unless the page is intentionally excluded from search.",
          affectedUrl: urlOf(page),
        })),
  },
  {
    id: "technical/missing-canonical",
    version: RULE_VERSION,
    category: "Technical",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => textLength(page.canonicalUrl) === 0 && !isNoIndex(page.robotsDirectives))
        .map((page) => ({
          severity: "low",
          title: "Indexable page has no canonical URL",
          description:
            "The page is indexable (it does not request noindex) but declares no canonical URL, leaving search engines to choose the canonical variant themselves.",
          evidence: {
            summary: "Indexable page recorded no rel=canonical link.",
            data: { url: urlOf(page), canonicalUrl: page.canonicalUrl, robotsDirectives: page.robotsDirectives },
          },
          impact: "low",
          effort: "low",
          recommendation: "Add a self-referencing rel=canonical link to the preferred URL for this page.",
          affectedUrl: urlOf(page),
        })),
  },
  {
    id: "technical/broken-internal-link",
    version: RULE_VERSION,
    category: "Technical",
    evaluate: (evidence): RuleFindingInput[] =>
      detectBrokenInternalLinks(evidence).map(({ page, link, reason }) => ({
        severity: "high",
        title: "Internal link points to an unreachable URL",
        description: `The page links to ${link}, which the crawler could not retrieve (${reason}). Broken internal navigation wastes crawl budget and blocks visitors.`,
        evidence: {
          summary: `Crawler verified that ${link} could not be served (${reason}).`,
          data: { url: urlOf(page), brokenLink: link, reason },
        },
        impact: "high",
        effort: "medium",
        recommendation: "Fix or remove the broken link, or redirect the target to a valid URL.",
        affectedUrl: urlOf(page),
      })),
  },
];
