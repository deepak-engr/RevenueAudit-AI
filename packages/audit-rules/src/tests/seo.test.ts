import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("missing title produces a high severity SEO finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ title: null })]));
  const findings = findingsByRule(result, "seo/missing-title");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "high");
  assert.equal(findings[0].category, "SEO");
  assert.equal(findings[0].affectedUrl, "https://example.com/");
});

test("missing meta description produces a finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ metaDescription: null })]));
  const findings = findingsByRule(result, "seo/missing-meta-description");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "medium");
});

test("missing H1 produces a finding in the SEO category", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ h1Headings: [] })]));
  const findings = findingsByRule(result, "seo/missing-h1");
  assert.equal(findings.length, 1);
});

test("multiple H1 headings produce a finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ h1Headings: ["One", "Two"] })]));
  const findings = findingsByRule(result, "seo/multiple-h1");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].evidence.data.h1Count, 2);
});

test("short and long titles are flagged (but a healthy title is not)", () => {
  const short = runAuditEngine(buildEvidence([buildPage({ title: "Too short" })]));
  const long = runAuditEngine(buildEvidence([buildPage({ title: "x".repeat(61) })]));
  const healthy = runAuditEngine(buildEvidence([buildPage()]));

  assert.equal(findingsByRule(short, "seo/title-too-short").length, 1);
  assert.equal(findingsByRule(long, "seo/title-too-long").length, 1);
  assert.equal(findingsByRule(healthy, "seo/title-too-short").length, 0);
  assert.equal(findingsByRule(healthy, "seo/title-too-long").length, 0);
});

test("short and long meta descriptions are flagged", () => {
  const short = runAuditEngine(buildEvidence([buildPage({ metaDescription: "Too short." })]));
  const long = runAuditEngine(buildEvidence([buildPage({ metaDescription: "y".repeat(161) })]));

  assert.equal(findingsByRule(short, "seo/meta-description-too-short").length, 1);
  assert.equal(findingsByRule(long, "seo/meta-description-too-long").length, 1);
});

test("missing canonical link is flagged in the SEO category", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ canonicalUrl: null })]));
  assert.equal(findingsByRule(result, "seo/missing-canonical").length, 1);
});
