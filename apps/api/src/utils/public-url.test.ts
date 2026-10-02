import assert from "node:assert/strict";
import test from "node:test";
import { publicHttpUrlSchema } from "./public-url.js";

test("public URL schema accepts public HTTP and HTTPS URLs", () => {
  assert.equal(publicHttpUrlSchema.parse("https://www.example.com/path"), "https://www.example.com/path");
  assert.equal(publicHttpUrlSchema.parse("http://example.org"), "http://example.org");
});

test("public URL schema rejects unsafe or malformed URLs", () => {
  for (const value of ["not-a-url", "ftp://example.com", "http://localhost:3000", "http://127.0.0.1", "http://[::1]", "http://10.0.0.5", "http://192.168.1.1", "http://internal"]) {
    assert.equal(publicHttpUrlSchema.safeParse(value).success, false, value);
  }
});
