import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("a non-200 page produces a critical technical finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ status: 404 })]));
  const findings = findingsByRule(result, "technical/non-200-status");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "critical");
});

test("a redirect (requested URL differs from final URL) is recorded as a low finding", () => {
  const result = runAuditEngine(
    buildEvidence([buildPage({ requestedUrl: "https://example.com/", finalUrl: "https://example.com/home" })]),
  );
  const findings = findingsByRule(result, "technical/redirect-detected");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "low");
});

test("noindex robots meta produces a high finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ robotsDirectives: ["noindex", "follow"] })]));
  const findings = findingsByRule(result, "technical/robots-noindex");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "high");
});

test("a missing canonical on an indexable page produces a technical finding", () => {
  const indexable = runAuditEngine(buildEvidence([buildPage({ canonicalUrl: null })]));
  const noindexed = runAuditEngine(buildEvidence([buildPage({ canonicalUrl: null, robotsDirectives: ["noindex"] })]));
  assert.equal(findingsByRule(indexable, "technical/missing-canonical").length, 1);
  assert.equal(findingsByRule(noindexed, "technical/missing-canonical").length, 0);
});

test("broken internal links are only reported when the crawler verified them", () => {
  const evidence = buildEvidence([buildPage({ internalLinks: ["https://example.com/missing", "https://example.com/about"] })], {
    failures: [{ requestedUrl: "https://example.com/missing", code: "NAVIGATION_ERROR", message: "net::ERR_NAME_NOT_RESOLVED" }],
  });
  const result = runAuditEngine(evidence);
  const findings = findingsByRule(result, "technical/broken-internal-link");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].evidence.data.brokenLink, "https://example.com/missing");
  assert.equal(findings[0].severity, "high");
});

test("unverified links that were never crawled are not reported as broken", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ internalLinks: ["https://example.com/never-crawled"] })]));
  assert.equal(findingsByRule(result, "technical/broken-internal-link").length, 0);
});
