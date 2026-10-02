import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("a page with no detectable issues produces no findings and a perfect score", () => {
  const result = runAuditEngine(buildEvidence([buildPage()]));
  assert.equal(result.findings.length, 0);
  assert.equal(result.score.overall, 100);
  assert.equal(result.score.byCategory.SEO, 100);
  assert.equal(result.pagesAnalyzed, 1);
});

test("empty evidence produces no findings and does not throw", () => {
  const result = runAuditEngine(buildEvidence([]));
  assert.equal(result.findings.length, 0);
  assert.equal(result.score.overall, 100);
  assert.equal(result.pagesAnalyzed, 0);
});

test("findings carry unique ids and complete rule metadata", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ title: null, h1Headings: [], canonicalUrl: null })]));
  assert.ok(result.findings.length >= 3);
  const ids = result.findings.map((finding) => finding.issueId);
  assert.equal(new Set(ids).size, ids.length);
  for (const finding of result.findings) {
    assert.ok(finding.ruleId.length > 0);
    assert.equal(finding.ruleVersion, result.ruleSetVersion);
    assert.ok(finding.affectedUrl.length > 0);
    assert.ok(finding.recommendation.length > 0);
  }
});

test("multiple pages are analyzed and each page contributes its own findings", () => {
  const clean = buildPage({ requestedUrl: "https://example.com/", finalUrl: "https://example.com/" });
  const broken = buildPage({
    requestedUrl: "https://example.com/second",
    finalUrl: "https://example.com/second",
    title: null,
  });
  const result = runAuditEngine(buildEvidence([clean, broken]));

  assert.equal(result.pagesAnalyzed, 2);
  const titleFindings = findingsByRule(result, "seo/missing-title");
  assert.equal(titleFindings.length, 1);
  assert.equal(titleFindings[0].affectedUrl, "https://example.com/second");
});

test("identical evidence yields identical findings and scores (deterministic)", () => {
  const evidence = buildEvidence([buildPage({ title: null, wordCount: 120, canonicalUrl: null })]);
  const first = runAuditEngine(evidence);
  const second = runAuditEngine(evidence);
  assert.deepEqual(
    first.findings.map((f) => f.issueId),
    second.findings.map((f) => f.issueId),
  );
  assert.deepEqual(first.score, second.score);
});

test("a well-known thin, untitled page scores below a healthy page", () => {
  const healthy = runAuditEngine(buildEvidence([buildPage()]));
  const poor = runAuditEngine(buildEvidence([buildPage({ title: null, metaDescription: null, h1Headings: [], wordCount: 30 })]));
  assert.ok(poor.score.overall < healthy.score.overall);
});
