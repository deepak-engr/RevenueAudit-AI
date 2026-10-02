/**
 * Deterministic audit engine contracts.
 *
 * This package is intentionally independent from the crawler implementation. It
 * describes the *evidence* it consumes structurally (rather than importing any
 * crawler package) so that any object matching `AuditEvidenceInput` can be
 * audited. The crawler worker's `CrawlResult` already matches this shape.
 *
 * Nothing here is probabilistic: rules only read observed crawler values and
 * map them to findings. No scores, amounts, or facts are ever invented.
 */

/** The five audit categories every finding is assigned to. */
export type AuditCategory = "SEO" | "Technical" | "Content" | "Links" | "Revenue";

/** Canonical, ordered category list used for scoring and reporting. */
export const AUDIT_CATEGORIES: readonly AuditCategory[] = ["SEO", "Technical", "Content", "Links", "Revenue"] as const;

/** Deterministic severity assigned to a finding by the rule that produced it. */
export type Severity = "critical" | "high" | "medium" | "low";

/** Business impact of addressing a finding. */
export type Impact = "high" | "medium" | "low";

/** Implementation effort required to address a finding. */
export type Effort = "low" | "medium" | "high";

/** Human-readable plus structured evidence copied verbatim from crawler output. */
export interface AuditEvidence {
  /** Plain-language statement of exactly what was observed. */
  summary: string;
  /** Verifiable values taken from crawler evidence. Never synthesised. */
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Evidence input (structurally compatible with the crawler worker's output)
// ---------------------------------------------------------------------------

export interface ImageEvidenceInput {
  src: string;
  alt: string | null;
}

export interface PageEvidenceInput {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  title: string | null;
  metaDescription: string | null;
  h1Headings: string[];
  h2Headings: string[];
  wordCount: number;
  canonicalUrl: string | null;
  robotsDirectives: string[];
  internalLinks: string[];
  externalLinks: string[];
  images: ImageEvidenceInput[];
  imagesMissingAlt: string[];
  crawlTimestamp: string;
  language: string | null;
  viewport: string | null;
  responseContentType: string | null;
  responseSizeBytes: number;
}

export interface FailureEvidenceInput {
  requestedUrl: string;
  code: string;
  message: string;
}

export interface AuditEvidenceInput {
  requestedUrl: string;
  startedAt: string;
  completedAt: string;
  pages: PageEvidenceInput[];
  failures: FailureEvidenceInput[];
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export interface AuditFinding {
  /** Unique, deterministic issue identifier (`<ruleId>#<sequence>`). */
  issueId: string;
  /** Identifier of the rule that produced the finding. */
  ruleId: string;
  /** Version of the rule that produced the finding. */
  ruleVersion: string;
  category: AuditCategory;
  severity: Severity;
  title: string;
  description: string;
  evidence: AuditEvidence;
  impact: Impact;
  effort: Effort;
  recommendation: string;
  affectedUrl: string;
}

/** A finding before the engine assigns its `issueId`, `ruleId`, `ruleVersion`, and `category`. */
export interface RuleFindingInput {
  severity: Severity;
  title: string;
  description: string;
  evidence: AuditEvidence;
  impact: Impact;
  effort: Effort;
  recommendation: string;
  affectedUrl: string;
}

/** A deterministically evaluated rule over verified crawler evidence. */
export interface AuditRule {
  readonly id: string;
  readonly version: string;
  readonly category: AuditCategory;
  evaluate(evidence: AuditEvidenceInput): RuleFindingInput[];
}

// ---------------------------------------------------------------------------
// Scores and result
// ---------------------------------------------------------------------------

export interface CategoryScore {
  category: AuditCategory;
  score: number;
  findingCount: number;
}

export interface AuditScore {
  /** Mean of the five category scores, rounded to the nearest integer. */
  overall: number;
  /** Deterministic per-category score (100 minus the sum of finding penalties, floored at 0). */
  byCategory: Record<AuditCategory, number>;
  severityCounts: Record<Severity, number>;
  totalFindings: number;
}

export interface AuditResult {
  requestedUrl: string;
  generatedAt: string;
  ruleSetVersion: string;
  pagesAnalyzed: number;
  findings: AuditFinding[];
  score: AuditScore;
}
