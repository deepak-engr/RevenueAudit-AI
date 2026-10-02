import { IMAGES_MISSING_ALT_MEDIUM_THRESHOLD, RULE_VERSION } from "../constants.js";
import type { AuditRule, RuleFindingInput } from "../types.js";
import { urlOf } from "./helpers.js";

/**
 * Image rules. The crawler reports, per page, the exact list of images whose src
 * has no alt attribute (`imagesMissingAlt`). This rule reports that verified
 * list; it is categorised under SEO because alt text affects image search and
 * accessibility discoverability.
 */
export const imageRules: AuditRule[] = [
  {
    id: "images/missing-alt",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const missing = page.imagesMissingAlt ?? [];
        if (missing.length === 0) return [];
        const severity = missing.length >= IMAGES_MISSING_ALT_MEDIUM_THRESHOLD ? "medium" : "low";
        return [
          {
            severity,
            title: "Images are missing alternative text",
            description: `${missing.length} image(s) on this page have no alt attribute. Alternative text describes image content for search engines and assistive technology.`,
            evidence: {
              summary: `Crawler recorded ${missing.length} image(s) with missing alt text.`,
              data: { url: urlOf(page), imagesMissingAlt: missing, imageCount: page.images.length },
            },
            impact: "low",
            effort: "medium",
            recommendation: "Add concise, descriptive alt text to meaningful images and an empty alt for purely decorative ones.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
];
