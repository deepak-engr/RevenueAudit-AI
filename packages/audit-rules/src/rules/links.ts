import { EXCESSIVE_EXTERNAL_LINKS, MIN_HEALTHY_INTERNAL_LINKS, RULE_VERSION } from "../constants.js";
import type { AuditRule, RuleFindingInput } from "../types.js";
import { detectBrokenInternalLinks } from "./broken-links.js";
import { urlOf } from "./helpers.js";

/**
 * Links rules. Internal/external link counts and broken-link status are taken
 * directly from crawler output. A link is only reported broken when the crawler
 * proved it could not be served.
 */
export const linkRules: AuditRule[] = [
  {
    id: "links/few-internal-links",
    version: RULE_VERSION,
    category: "Links",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const count = page.internalLinks.length;
        if (count >= MIN_HEALTHY_INTERNAL_LINKS) return [];
        return [
          {
            severity: count === 0 ? "high" : "medium",
            title: "Page has very few internal links",
            description: `The page exposes ${count} internal link(s), below the minimum of ${MIN_HEALTHY_INTERNAL_LINKS}. Internal links help visitors navigate and help crawlers discover related pages.`,
            evidence: {
              summary: `Crawler recorded ${count} internal link(s); minimum is ${MIN_HEALTHY_INTERNAL_LINKS}.`,
              data: { url: urlOf(page), internalLinkCount: count, minimum: MIN_HEALTHY_INTERNAL_LINKS },
            },
            impact: "medium",
            effort: "low",
            recommendation: "Add contextual internal links to relevant pages of the site.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "links/broken-internal-link",
    version: RULE_VERSION,
    category: "Links",
    evaluate: (evidence): RuleFindingInput[] =>
      detectBrokenInternalLinks(evidence).map(({ page, link, reason }) => ({
        severity: "high",
        title: "Broken internal link",
        description: `An internal link on this page points to ${link}, which the crawler verified could not be served (${reason}).`,
        evidence: {
          summary: `Crawler verified ${link} is unreachable (${reason}).`,
          data: { url: urlOf(page), brokenLink: link, reason },
        },
        impact: "high",
        effort: "medium",
        recommendation: "Repair the link target or remove the link to keep internal navigation reliable.",
        affectedUrl: urlOf(page),
      })),
  },
  {
    id: "links/excessive-external-links",
    version: RULE_VERSION,
    category: "Links",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const count = page.externalLinks.length;
        if (count <= EXCESSIVE_EXTERNAL_LINKS) return [];
        return [
          {
            severity: "low",
            title: "Page contains an unusually high number of external links",
            description: `The page links to ${count} external URLs on a single page, above the ${EXCESSIVE_EXTERNAL_LINKS} threshold. A very high external link count can dilute topical focus.`,
            evidence: {
              summary: `Crawler recorded ${count} external link(s); threshold is ${EXCESSIVE_EXTERNAL_LINKS}.`,
              data: { url: urlOf(page), externalLinkCount: count, threshold: EXCESSIVE_EXTERNAL_LINKS },
            },
            impact: "low",
            effort: "medium",
            recommendation: "Review external links and keep only those that add clear value to the page.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
];
