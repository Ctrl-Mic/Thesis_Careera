import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeEmail,
  hashPassword,
  verifyPassword,
} from "../services/authService.js";
import {
  createPendingRegistration,
  getPendingRegistration,
  hasPendingRegistrationEmail,
  removePendingRegistration,
} from "../services/pendingRegistrationService.js";

test("normalizeEmail trims and lowercases email addresses", () => {
  assert.equal(normalizeEmail(" Student@Example.com "), "student@example.com");
});

test("verifyPassword validates the hash for a real password", async () => {
  const hash = await hashPassword("TestPassword123!");

  assert.equal(await verifyPassword("TestPassword123!", hash), true);
  assert.equal(await verifyPassword("WrongPassword", hash), false);
});

test("pending registrations keep credentials out of registered accounts until removed", () => {
  const registration = {
    userId: "pending-user",
    email: "student@example.com",
    passwordHash: "password-hash",
  };
  const token = createPendingRegistration(registration);
  const pending = getPendingRegistration(token);

  assert.notEqual(token, registration.userId);
  assert.equal(pending.userId, registration.userId);
  assert.equal(pending.email, registration.email);
  assert.equal(pending.passwordHash, registration.passwordHash);
  assert.equal(typeof pending.expiresAt, "number");
  assert.equal(hasPendingRegistrationEmail(registration.email), true);

  removePendingRegistration(token);

  assert.equal(getPendingRegistration(token), null);
  assert.equal(hasPendingRegistrationEmail(registration.email), false);
});
