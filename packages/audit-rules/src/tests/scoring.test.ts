import assert from "node:assert/strict";
import test from "node:test";
import { AUDIT_CATEGORIES, SEVERITY_WEIGHTS, scoreFindings } from "../index.js";
import { buildFinding } from "./helpers.js";

test("severity weights strictly decrease from critical to low", () => {
  assert.ok(SEVERITY_WEIGHTS.critical > SEVERITY_WEIGHTS.high);
  assert.ok(SEVERITY_WEIGHTS.high > SEVERITY_WEIGHTS.medium);
  assert.ok(SEVERITY_WEIGHTS.medium > SEVERITY_WEIGHTS.low);
});

test("a critical finding lowers a category score more than a low finding does", () => {
  const critical = scoreFindings([buildFinding({ category: "Technical", severity: "critical" })]);
  const low = scoreFindings([buildFinding({ category: "Technical", severity: "low" })]);
  assert.ok(critical.byCategory.Technical < low.byCategory.Technical);
});

test("category scores subtract severity penalties and are floored at 0", () => {
  const score = scoreFindings([
    buildFinding({ category: "SEO", severity: "high" }),
    buildFinding({ category: "SEO", severity: "medium" }),
  ]);
  // 100 - (15 + 8) = 77
  assert.equal(score.byCategory.SEO, 77);

  const floored = scoreFindings(
    Array.from({ length: 6 }, () => buildFinding({ category: "SEO", severity: "critical" })),
  );
  assert.equal(floored.byCategory.SEO, 0);
});

test("a category with no findings scores 100 (never a random value)", () => {
  const score = scoreFindings([buildFinding({ category: "SEO", severity: "high" })]);
  for (const category of AUDIT_CATEGORIES) {
    if (category === "SEO") continue;
    assert.equal(score.byCategory[category], 100, category);
  }
});

test("the overall score is the rounded mean of the five category scores", () => {
  const score = scoreFindings([buildFinding({ category: "SEO", severity: "high" })]);
  // SEO = 85, everything else = 100 -> mean 97
  assert.equal(score.overall, 97);
});

test("no findings yields a perfect overall score", () => {
  const score = scoreFindings([]);
  assert.equal(score.overall, 100);
  assert.equal(score.totalFindings, 0);
});
