import assert from "node:assert/strict";
import test from "node:test";
import { runAuditEngine } from "../index.js";
import { buildEvidence, buildPage, findingsByRule } from "./helpers.js";

test("images missing alt text produce a finding (medium when several are missing)", () => {
  const one = runAuditEngine(
    buildEvidence([buildPage({ imagesMissingAlt: ["https://example.com/a.png"] })]),
  );
  const several = runAuditEngine(
    buildEvidence([
      buildPage({ imagesMissingAlt: ["https://example.com/a.png", "https://example.com/b.png", "https://example.com/c.png"] }),
    ]),
  );

  assert.equal(findingsByRule(one, "images/missing-alt")[0].severity, "low");
  assert.equal(findingsByRule(several, "images/missing-alt")[0].severity, "medium");
});

test("a page with no missing alt text produces no image finding", () => {
  const result = runAuditEngine(buildEvidence([buildPage({ imagesMissingAlt: [] })]));
  assert.equal(findingsByRule(result, "images/missing-alt").length, 0);
});
