import { AUDIT_CATEGORIES, type AuditCategory, type AuditFinding, type AuditScore, type Severity } from "../types.js";

/**
 * Transparent, deterministic scoring.
 *
 * Algorithm
 * ---------
 * 1. Each finding contributes a fixed penalty based on its severity:
 *      critical = 25, high = 15, medium = 8, low = 3.
 *    Weights strictly decrease from critical -> low, so a critical finding always
 *    costs more than a high, a high more than a medium, and so on.
 * 2. A category score starts at 100 and subtracts the sum of penalties for every
 *    finding in that category, then is floored at 0 (and rounded).
 * 3. A category with no findings keeps a score of 100. It is never assigned a
 *    random or assumed value; a clean category is a perfect category.
 * 4. The overall score is the arithmetic mean of the five category scores,
 *    rounded to the nearest integer. Every category carries equal weight.
 *
 * The result is fully reproducible for a given set of findings: identical
 * evidence yields identical findings and therefore identical scores.
 */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

/** Penalty (points removed from a category score) contributed by one finding of the given severity. */
export function penaltyForSeverity(severity: Severity): number {
  return SEVERITY_WEIGHTS[severity];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Computes deterministic category and overall scores from a set of findings. */
export function scoreFindings(findings: AuditFinding[]): AuditScore {
  const byCategory = {} as Record<AuditCategory, number>;
  const severityCounts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const category of AUDIT_CATEGORIES) {
    const categoryFindings = findings.filter((finding) => finding.category === category);
    const penalty = categoryFindings.reduce((total, finding) => total + SEVERITY_WEIGHTS[finding.severity], 0);
    byCategory[category] = clampScore(100 - penalty);
    for (const finding of categoryFindings) severityCounts[finding.severity] += 1;
  }

  const total = AUDIT_CATEGORIES.reduce((sum, category) => sum + byCategory[category], 0);
  const overall = Math.round(total / AUDIT_CATEGORIES.length);

  return { overall, byCategory, severityCounts, totalFindings: findings.length };
}
