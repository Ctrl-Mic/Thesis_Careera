import { Buffer } from "node:buffer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import process from "node:process";

const processSecret = randomBytes(32);
const tokenLifetimeSeconds = 8 * 60 * 60;

function getSigningSecret() {
  return process.env.AUTH_TOKEN_SECRET ?? processSecret;
}

function sign(value) {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

export function createAuthToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
  })).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function getAuthUserId(token) {
  if (typeof token !== "string") return null;

  const [payload, suppliedSignature, extraPart] = token.split(".");
  if (!payload || !suppliedSignature || extraPart !== undefined) return null;

  const expectedSignature = Buffer.from(sign(payload), "base64url");
  const actualSignature = Buffer.from(suppliedSignature, "base64url");
  if (
    expectedSignature.length !== actualSignature.length
    || !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof claims.userId !== "string"
      || typeof claims.expiresAt !== "number"
      || claims.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return claims.userId;
  } catch {
    return null;
  }
}
