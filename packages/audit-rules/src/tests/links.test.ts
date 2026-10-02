import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("very few internal links are flagged (severity rises when there are none)", () => {
  const none = runAuditEngine(buildEvidence([buildPage({ internalLinks: [] })]));
  const two = runAuditEngine(buildEvidence([buildPage({ internalLinks: ["https://example.com/a", "https://example.com/b"] })]));

  assert.equal(findingsByRule(none, "links/few-internal-links")[0].severity, "high");
  assert.equal(findingsByRule(two, "links/few-internal-links")[0].severity, "medium");
});

test("broken internal links are reported in the Links category", () => {
  const evidence = buildEvidence([buildPage({ internalLinks: ["https://example.com/gone"] })], {
    failures: [{ requestedUrl: "https://example.com/gone", code: "TIMEOUT", message: "navigation timeout" }],
  });
  const findings = findingsByRule(runAuditEngine(evidence), "links/broken-internal-link");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].evidence.data.reason, "TIMEOUT");
});

test("excessive external links are flagged only above the measurable threshold", () => {
  const many = runAuditEngine(
    buildEvidence([buildPage({ externalLinks: Array.from({ length: 51 }, (_, i) => `https://external.example/${i}`) })]),
  );
  const few = runAuditEngine(buildEvidence([buildPage({ externalLinks: ["https://a.example/", "https://b.example/"] })]));

  assert.equal(findingsByRule(many, "links/excessive-external-links").length, 1);
  assert.equal(findingsByRule(few, "links/excessive-external-links").length, 0);
});
