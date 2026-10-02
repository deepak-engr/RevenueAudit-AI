import { MIN_ACCEPTABLE_WORD_COUNT, RULE_VERSION, VERY_LOW_WORD_COUNT, WEAK_HEADING_WORD_COUNT } from "../constants.js";
import type { AuditRule, RuleFindingInput } from "../types.js";
import { urlOf } from "./helpers.js";

/**
 * Content rules built only from measured text volume and heading counts. Word
 * count and heading arrays come straight from the crawler; no readability or
 * subjective judgement is applied.
 */
export const contentRules: AuditRule[] = [
  {
    id: "content/very-low-word-count",
    version: RULE_VERSION,
    category: "Content",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        if (page.wordCount >= VERY_LOW_WORD_COUNT) return [];
        return [
          {
            severity: "high",
            title: "Page has a very low word count",
            description: `The crawler counted ${page.wordCount} words in the page body, below the ${VERY_LOW_WORD_COUNT}-word threshold. Pages this thin rarely communicate enough to rank or satisfy visitors.`,
            evidence: {
              summary: `Body word count ${page.wordCount} is below ${VERY_LOW_WORD_COUNT}.`,
              data: { url: urlOf(page), wordCount: page.wordCount, threshold: VERY_LOW_WORD_COUNT },
            },
            impact: "medium",
            effort: "high",
            recommendation: "Add substantive, original content that answers what visitors are looking for.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "content/insufficient-content",
    version: RULE_VERSION,
    category: "Content",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        if (page.wordCount < VERY_LOW_WORD_COUNT || page.wordCount >= MIN_ACCEPTABLE_WORD_COUNT) return [];
        return [
          {
            severity: "medium",
            title: "Page has insufficient textual content",
            description: `The crawler counted ${page.wordCount} words, which is below the ${MIN_ACCEPTABLE_WORD_COUNT}-word guideline for a substantive page.`,
            evidence: {
              summary: `Body word count ${page.wordCount} is below ${MIN_ACCEPTABLE_WORD_COUNT}.`,
              data: { url: urlOf(page), wordCount: page.wordCount, guideline: MIN_ACCEPTABLE_WORD_COUNT },
            },
            impact: "medium",
            effort: "medium",
            recommendation: "Expand the page with useful detail, examples, or answers to common questions.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
  {
    id: "content/missing-h1",
    version: RULE_VERSION,
    category: "Content",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages
        .filter((page) => page.h1Headings.length === 0)
        .map((page) => ({
          severity: "medium",
          title: "Page content lacks a primary heading",
          description:
            "The page has no H1, so the document has no clear primary heading. Readers scanning the content have no immediate statement of what the page covers.",
          evidence: {
            summary: "Crawler recorded zero <h1> elements on this page.",
            data: { url: urlOf(page), h1Headings: page.h1Headings },
          },
          impact: "medium",
          effort: "low",
          recommendation: "Introduce a single H1 that states the page's main subject.",
          affectedUrl: urlOf(page),
        })),
  },
  {
    id: "content/weak-heading-structure",
    version: RULE_VERSION,
    category: "Content",
    evaluate: (evidence): RuleFindingInput[] =>
      evidence.pages.flatMap((page): RuleFindingInput[] => {
        const headingCount = page.h1Headings.length + page.h2Headings.length;
        if (page.wordCount < WEAK_HEADING_WORD_COUNT || headingCount >= 2) return [];
        return [
          {
            severity: "low",
            title: "Long page has weak heading structure",
            description: `The page is ${page.wordCount} words long but exposes only ${headingCount} H1/H2 heading(s). Long content without section headings is hard to scan.`,
            evidence: {
              summary: `${page.wordCount} words with only ${headingCount} H1/H2 heading(s).`,
              data: {
                url: urlOf(page),
                wordCount: page.wordCount,
                h1Count: page.h1Headings.length,
                h2Count: page.h2Headings.length,
                wordCountThreshold: WEAK_HEADING_WORD_COUNT,
              },
            },
            impact: "low",
            effort: "medium",
            recommendation: "Break the page into clearly labelled sections using H2 and H3 headings.",
            affectedUrl: urlOf(page),
          },
        ];
      }),
  },
];
