import assert from "node:assert/strict";
import test from "node:test";
import { isCrawlResult } from "./index.js";

test("crawler output guard accepts structurally valid evidence output", () => {
  assert.equal(isCrawlResult({ requestedUrl: "https://example.com/", startedAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T00:00:01.000Z", pages: [{ requestedUrl: "https://example.com/", finalUrl: "https://example.com/", status: 200, internalLinks: [] }], failures: [] }), true);
  assert.equal(isCrawlResult({ pages: [] }), false);
});
