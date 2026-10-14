import test from "node:test";
import assert from "node:assert/strict";

import { createAuthToken, getAuthUserId } from "../services/sessionService.js";

test("auth tokens identify the user they were issued for", () => {
  const token = createAuthToken("user-id");

  assert.equal(getAuthUserId(token), "user-id");
});

test("auth tokens reject tampering and malformed values", () => {
  const token = createAuthToken("user-id");
  const [payload, signature] = token.split(".");
  const tamperedToken = `${payload}.${signature.slice(0, -1)}x`;

  assert.equal(getAuthUserId(tamperedToken), null);
  assert.equal(getAuthUserId("not-a-token"), null);
});
