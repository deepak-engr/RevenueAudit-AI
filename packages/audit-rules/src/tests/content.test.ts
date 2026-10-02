import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("a very low word count produces a high severity content finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ wordCount: 40 })]));
  const findings = findingsByRule(result, "content/very-low-word-count");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "high");
  // The mild "insufficient content" rule must not also fire for the same page.
  assert.equal(findingsByRule(result, "content/insufficient-content").length, 0);
});

test("insufficient (but not minimal) content produces a medium severity finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ wordCount: 200 })]));
  const findings = findingsByRule(result, "content/insufficient-content");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "medium");
  assert.equal(findingsByRule(result, "content/very-low-word-count").length, 0);
});

test("missing H1 is reflected in the Content category too", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ h1Headings: [] })]));
  assert.equal(findingsByRule(result, "content/missing-h1").length, 1);
});

test("a long page with weak heading structure is flagged", () => {
  const weak = runAuditEngine(buildEvidence([buildPage({ wordCount: 800, h1Headings: [], h2Headings: [] })]));
  const strong = runAuditEngine(buildEvidence([buildPage({ wordCount: 800 })]));
  assert.equal(findingsByRule(weak, "content/weak-heading-structure").length, 1);
  assert.equal(findingsByRule(strong, "content/weak-heading-structure").length, 0);
});
