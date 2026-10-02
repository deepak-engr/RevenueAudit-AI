import assert from "node:assert/strict";
import test from "node:test";
import { CrawlError, isBlockedAddress, normalizeUrl } from "./index.js";

test("blocks private, loopback, link-local, and internal address ranges", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.1.1", "::1", "fe80::1", "fc00::1"]) assert.equal(isBlockedAddress(address), true, address);
  assert.equal(isBlockedAddress("8.8.8.8"), false);
});
test("normalizes URLs for crawl deduplication", () => {
  assert.equal(normalizeUrl("HTTPS://Example.COM:443/docs#top"), "https://example.com/docs");
  assert.equal(new Set([normalizeUrl("https://example.com/a#one"), normalizeUrl("https://example.com/a#two")]).size, 1);
});
test("rejects unsupported and credentialed URLs", () => {
  assert.throws(() => normalizeUrl("ftp://example.com"), CrawlError);
  assert.throws(() => normalizeUrl("https://user:pass@example.com"), CrawlError);
});
