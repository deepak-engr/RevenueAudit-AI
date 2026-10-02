import {
  META_DESCRIPTION_MAX_LENGTH,
  META_DESCRIPTION_MIN_LENGTH,
  RULE_VERSION,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from "../constants.js";
import type { AuditRule, RuleFindingInput } from "../types.js";
import { textLength, urlOf } from "./helpers.js";

/**
 * SEO rules. Each rule reads only verified crawler values (title text, meta
 * description, heading tags, canonical link) and maps a measurable condition to
 * a finding. Nothing is inferred beyond what the crawler recorded.
 */
export const seoRules: AuditRule[] = [
  {
    id: "seo/missing-title",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => textLength(page.title) === 0)
        .map((page) => ({
          severity: "high",
          title: "Page is missing a title tag",
          description:
            "The page defines no HTML <title> text. Search engines use the title as the primary headline in results, so an absent title is a significant discoverability gap.",
          evidence: {
            summary: "Crawler recorded no <title> text for this page.",
            data: { url: urlOf(page), title: page.title },
          },
          impact: "high",
          effort: "low",
          recommendation: "Add a descriptive <title> that summarises the page and names its primary topic.",
          affectedUrl: urlOf(page),
        })),
  },
  {
    id: "seo/title-too-short",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const length = textLength(page.title);
        if (length === 0 || length >= TITLE_MIN_LENGTH) return [];
        return [
          {
            severity: "low",
            title: "Title is shorter than recommended",
            description: `The title is ${length} characters long, below the recommended minimum of ${TITLE_MIN_LENGTH}. Very short titles give search engines little context about the page.`,
            evidence: {
              summary: `Title length ${length} is below the ${TITLE_MIN_LENGTH} character minimum.`,
              data: { url: urlOf(page), title: page.title, length, recommendedMinimum: TITLE_MIN_LENGTH },
            },
            impact: "low",
            effort: "low",
            recommendation: `Expand the title toward ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters while keeping it accurate.`,
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "seo/title-too-long",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const length = textLength(page.title);
        if (length <= TITLE_MAX_LENGTH) return [];
        return [
          {
            severity: "low",
            title: "Title is longer than recommended",
            description: `The title is ${length} characters long, above the recommended maximum of ${TITLE_MAX_LENGTH}. Long titles are often truncated in search results.`,
            evidence: {
              summary: `Title length ${length} exceeds the ${TITLE_MAX_LENGTH} character maximum.`,
              data: { url: urlOf(page), title: page.title, length, recommendedMaximum: TITLE_MAX_LENGTH },
            },
            impact: "low",
            effort: "low",
            recommendation: `Shorten the title toward ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters.`,
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "seo/missing-meta-description",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => textLength(page.metaDescription) === 0)
        .map((page) => ({
          severity: "medium",
          title: "Page is missing a meta description",
          description:
            "The page defines no meta description. Search engines may generate a snippet anyway, but an explicit description usually produces a more accurate summary in results.",
          evidence: {
            summary: "Crawler recorded no meta description content for this page.",
            data: { url: urlOf(page), metaDescription: page.metaDescription },
          },
          impact: "medium",
          effort: "low",
          recommendation: "Add a unique meta description of roughly 70-160 characters that summarises the page.",
          affectedUrl: urlOf(page),
        })),
  },
  {
    id: "seo/meta-description-too-short",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const length = textLength(page.metaDescription);
        if (length === 0 || length >= META_DESCRIPTION_MIN_LENGTH) return [];
        return [
          {
            severity: "low",
            title: "Meta description is shorter than recommended",
            description: `The meta description is ${length} characters long, below the recommended minimum of ${META_DESCRIPTION_MIN_LENGTH}.`,
            evidence: {
              summary: `Meta description length ${length} is below the ${META_DESCRIPTION_MIN_LENGTH} character minimum.`,
              data: { url: urlOf(page), metaDescription: page.metaDescription, length, recommendedMinimum: META_DESCRIPTION_MIN_LENGTH },
            },
            impact: "low",
            effort: "low",
            recommendation: `Expand the meta description toward ${META_DESCRIPTION_MIN_LENGTH}-${META_DESCRIPTION_MAX_LENGTH} characters.`,
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "seo/meta-description-too-long",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const length = textLength(page.metaDescription);
        if (length <= META_DESCRIPTION_MAX_LENGTH) return [];
        return [
          {
            severity: "low",
            title: "Meta description is longer than recommended",
            description: `The meta description is ${length} characters long, above the recommended maximum of ${META_DESCRIPTION_MAX_LENGTH}. Excess length is usually truncated in search results.`,
            evidence: {
              summary: `Meta description length ${length} exceeds the ${META_DESCRIPTION_MAX_LENGTH} character maximum.`,
              data: { url: urlOf(page), metaDescription: page.metaDescription, length, recommendedMaximum: META_DESCRIPTION_MAX_LENGTH },
            },
            impact: "low",
            effort: "low",
            recommendation: `Trim the meta description toward ${META_DESCRIPTION_MIN_LENGTH}-${META_DESCRIPTION_MAX_LENGTH} characters.`,
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "seo/missing-h1",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => page.h1Headings.length === 0)
        .map((page) => ({
          severity: "medium",
          title: "Page has no H1 heading",
          description:
            "The page contains no <h1> element. An H1 signals the primary topic of the page to search engines and helps establish the heading hierarchy.",
          evidence: {
            summary: "Crawler recorded zero <h1> elements on this page.",
            data: { url: urlOf(page), h1Headings: page.h1Headings },
          },
          impact: "medium",
          effort: "low",
          recommendation: "Add a single, descriptive H1 that captures the main topic of the page.",
          affectedUrl: urlOf(page),
        })),
  },
  {
    id: "seo/multiple-h1",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        if (page.h1Headings.length <= 1) return [];
        return [
          {
            severity: "medium",
            title: "Page has multiple H1 headings",
            description: `The page contains ${page.h1Headings.length} <h1> elements. Multiple H1s can dilute topical clarity for search engines.`,
            evidence: {
              summary: `Crawler recorded ${page.h1Headings.length} <h1> elements on this page.`,
              data: { url: urlOf(page), h1Count: page.h1Headings.length, h1Headings: page.h1Headings },
            },
            impact: "medium",
            effort: "low",
            recommendation: "Keep a single H1 for the page topic and demote the others to H2/H3.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "seo/missing-canonical",
    version: RULE_VERSION,
    category: "SEO",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => textLength(page.canonicalUrl) === 0)
        .map((page) => ({
          severity: "low",
          title: "Page has no canonical link",
          description:
            "No rel=canonical link was found. Without a canonical URL, search engines decide for themselves which URL variant to index.",
          evidence: {
            summary: "Crawler recorded no rel=canonical link on this page.",
            data: { url: urlOf(page), canonicalUrl: page.canonicalUrl },
          },
          impact: "low",
          effort: "low",
          recommendation: "Add a rel=canonical link pointing at the preferred URL for this page.",
          affectedUrl: urlOf(page),
        })),
  },
];
