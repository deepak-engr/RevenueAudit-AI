import assert from "node:assert/strict";
import test from "node:test";
import { validateEnvironment } from "./env.js";

test("environment validation rejects invalid configuration", () => {
  assert.throws(() => validateEnvironment({ PORT: "invalid", FRONTEND_URL: "not-a-url" }), /Invalid environment configuration/);
});

test("environment validation applies safe development defaults", () => {
  const result = validateEnvironment({});
  assert.equal(result.PORT, 3001);
  assert.equal(result.FRONTEND_URL, "http://localhost:5173");
});
