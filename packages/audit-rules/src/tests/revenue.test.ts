import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("a missing mobile viewport on the primary page raises a revenue/CRO opportunity", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ viewport: null })]));
  assert.equal(findingsByRule(result, "revenue/missing-viewport").length, 1);
});

test("a site whose discovered links include no commercial pathway raises an opportunity", () => {
  const result = runAuditEngine(
    buildEvidence([buildPage({ internalLinks: ["https://example.com/a", "https://example.com/b", "https://example.com/c"] })]),
  );
  const findings = findingsByRule(result, "revenue/no-commercial-pathway");
  assert.equal(findings.length, 1);
  // The evidence must report only countable observations, never an amount.
  assert.equal((findings[0].evidence.data.matchedKeywords as unknown[]).length, 0);
  // No monetary amounts and no conversion-rate claims are ever made.
  assert.ok(!/\$\s?\d/.test(findings[0].description));
  assert.ok(!/conversion rate/i.test(findings[0].description));
});

test("a site with a discovered commercial path raises no opportunity", () => {
  const result = runAuditEngine(
    buildEvidence([buildPage({ internalLinks: ["https://example.com/pricing", "https://example.com/about"] })]),
  );
  assert.equal(findingsByRule(result, "revenue/no-commercial-pathway").length, 0);
});
