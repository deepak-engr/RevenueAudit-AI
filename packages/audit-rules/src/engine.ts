import { RULE_VERSION } from "./constants.js";
import { auditRules } from "./rules/index.js";
import { scoreFindings } from "./scoring/index.js";
import type { AuditEvidenceInput, AuditFinding, AuditResult } from "./types.js";

/**
 * Runs every deterministic rule against verified crawler evidence and returns
 * findings plus scores.
 *
 * Rules execute in a fixed order, so `issueId` values (and therefore the whole
 * result) are stable and reproducible for identical evidence. The engine never
 * manufactures data: it only re-frames observed crawler values.
 */
export function runAuditEngine(evidence: AuditEvidenceInput): AuditResult {
  const findings: AuditFinding[] = [];
  let sequence = 0;

  for (const rule of auditRules) {
    for (const draft of rule.evaluate(evidence)) {
      sequence += 1;
      findings.push({
        issueId: `${rule.id}#${String(sequence).padStart(4, "0")}`,
        ruleId: rule.id,
        ruleVersion: rule.version,
        category: rule.category,
        severity: draft.severity,
        title: draft.title,
        description: draft.description,
        evidence: draft.evidence,
        impact: draft.impact,
        effort: draft.effort,
        recommendation: draft.recommendation,
        affectedUrl: draft.affectedUrl,
      });
    }
  }

  return {
    requestedUrl: evidence.requestedUrl,
    generatedAt: new Date().toISOString(),
    ruleSetVersion: RULE_VERSION,
    pagesAnalyzed: evidence.pages.length,
    findings,
    score: scoreFindings(findings),
  };
}
