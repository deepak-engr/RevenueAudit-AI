import type { AuditEvidenceInput, AuditFinding, AuditResult, PageEvidenceInput } from "../types.js";

/**
 * Builds a fully healthy page that produces zero findings. Every test overrides
 * exactly the field(s) it wants to exercise, so assertions stay focused.
 */
export function buildPage(overrides: Partial<PageEvidenceInput> = {}): PageEvidenceInput {
  const base: PageEvidenceInput = {
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    status: 200,
    title: "A perfectly reasonable example page title",
    metaDescription:
      "A clear and complete meta description that sits comfortably within the recommended length range for search engines.",
    h1Headings: ["Example heading"],
    h2Headings: ["Section one", "Section two"],
    wordCount: 600,
    canonicalUrl: "https://example.com/",
    robotsDirectives: [],
    internalLinks: ["https://example.com/pricing", "https://example.com/about", "https://example.com/contact"],
    externalLinks: ["https://partner.example.org/"],
    images: [{ src: "https://example.com/hero.png", alt: "Hero" }],
    imagesMissingAlt: [],
    crawlTimestamp: "2026-01-01T00:00:00.000Z",
    language: "en",
    viewport: "width=device-width, initial-scale=1",
    responseContentType: "text/html; charset=utf-8",
    responseSizeBytes: 20480,
  };
  return { ...base, ...overrides };
}

export function buildEvidence(pages: PageEvidenceInput[], overrides: Partial<AuditEvidenceInput> = {}): AuditEvidenceInput {
  const requestedUrl = pages.length > 0 ? pages[0].requestedUrl : "https://example.com/";
  return {
    requestedUrl,
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:00:05.000Z",
    pages,
    failures: [],
    ...overrides,
  };
}

/** All findings produced by a given rule. */
export function findingsByRule(result: AuditResult, ruleId: string): AuditFinding[] {
  return result.findings.filter((finding) => finding.ruleId === ruleId);
}

/** Minimal synthetic finding used for scoring tests. */
export function buildFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    issueId: "test#0001",
    ruleId: "test/rule",
    ruleVersion: "1.0.0",
    category: "SEO",
    severity: "low",
    title: "Synthetic finding",
    description: "Synthetic finding used for scoring tests.",
    evidence: { summary: "synthetic", data: {} },
    impact: "low",
    effort: "low",
    recommendation: "n/a",
    affectedUrl: "https://example.com/",
    ...overrides,
  };
}
