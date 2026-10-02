import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeEmail,
  hashPassword,
  verifyPassword,
} from "../services/authService.js";

test("normalizeEmail trims and lowercases email addresses", () => {
  assert.equal(normalizeEmail(" Student@Example.com "), "student@example.com");
});

test("verifyPassword validates the hash for a real password", async () => {
  const hash = await hashPassword("TestPassword123!");

  assert.equal(await verifyPassword("TestPassword123!", hash), true);
  assert.equal(await verifyPassword("WrongPassword", hash), false);
});
