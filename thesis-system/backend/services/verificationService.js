import { Buffer } from "node:buffer";
import process from "node:process";

const maxImageBytes = 5 * 1024 * 1024;
const referenceLifetimeMs = 5 * 60 * 1000;
const faceMatchThreshold = 0.4;
const pendingFaceVectors = new Map();
const pendingFaceVectorTimers = new Map();

export function parseImageDataUrl(imageDataUrl) {
  if (typeof imageDataUrl !== "string") return null;

  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(imageDataUrl);
  if (!match) return null;

  const image = Buffer.from(match[1], "base64");
  if (
    image.length === 0
    || image.length > maxImageBytes
    || image.toString("base64") !== match[1]
  ) {
    return null;
  }

  return { base64: match[1], byteLength: image.length };
}

export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function getNameTokens(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getNameAnchors(value) {
  const parts = String(value ?? "").split(",");
  if (parts.length > 1) {
    const surname = getNameTokens(parts[0]);
    const givenName = getNameTokens(parts.slice(1).join(" "))[0];
    return [givenName, surname.at(-1)].filter(Boolean);
  }

  const tokens = getNameTokens(value);
  return tokens.length > 1 ? [tokens[0], tokens.at(-1)] : tokens;
}

export function nameAppearsInText(expectedName, recognizedText) {
  const nameTokens = getNameAnchors(expectedName);
  const textTokens = new Set(getNameTokens(recognizedText));

  return nameTokens.length > 0 && nameTokens.every((token) => textTokens.has(token));
}

export function isValidFaceVector(vector) {
  return Array.isArray(vector)
    && vector.length === 512
    && vector.every((value) => typeof value === "number" && Number.isFinite(value));
}

export function setPendingFaceVector(userId, vector) {
  removePendingFaceVector(userId);
  pendingFaceVectors.set(userId, {
    vector,
    expiresAt: Date.now() + referenceLifetimeMs,
  });
  const timer = setTimeout(() => {
    pendingFaceVectors.delete(userId);
    pendingFaceVectorTimers.delete(userId);
  }, referenceLifetimeMs);
  timer.unref();
  pendingFaceVectorTimers.set(userId, timer);
}

export function getPendingFaceVector(userId) {
  const pending = pendingFaceVectors.get(userId);
  if (!pending || pending.expiresAt <= Date.now()) {
    removePendingFaceVector(userId);
    return null;
  }
  return pending.vector;
}

export function removePendingFaceVector(userId) {
  pendingFaceVectors.delete(userId);
  const timer = pendingFaceVectorTimers.get(userId);
  if (timer) clearTimeout(timer);
  pendingFaceVectorTimers.delete(userId);
}

export function matchesFace(referenceVector, candidateVector) {
  if (!isValidFaceVector(referenceVector) || !isValidFaceVector(candidateVector)) {
    return false;
  }

  let dotProduct = 0;
  let referenceMagnitude = 0;
  let candidateMagnitude = 0;
  for (let index = 0; index < referenceVector.length; index += 1) {
    const referenceValue = referenceVector[index];
    const candidateValue = candidateVector[index];
    dotProduct += referenceValue * candidateValue;
    referenceMagnitude += referenceValue ** 2;
    candidateMagnitude += candidateValue ** 2;
  }

  if (referenceMagnitude === 0 || candidateMagnitude === 0) return false;

  const similarity = dotProduct / Math.sqrt(referenceMagnitude * candidateMagnitude);
  return similarity >= faceMatchThreshold;
}

export async function requestFaceAnalysis(endpoint, imageBase64) {
  const baseUrl = process.env.INSIGHTFACE_API_URL ?? "http://127.0.0.1:8000";
  const apiKey = process.env.INSIGHTFACE_API_KEY;
  if (!apiKey) {
    throw new Error("INSIGHTFACE_API_KEY is not configured.");
  }

  const response = await fetch(new URL(endpoint, `${baseUrl.replace(/\/+$/, "")}/`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ imageBase64 }),
    signal: AbortSignal.timeout(120_000),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    const error = new Error("InsightFace API returned a non-JSON response.");
    error.status = response.status;
    error.contentType = response.headers.get("content-type");
    throw error;
  }
  if (!response.ok) {
    const error = new Error(result.detail || `InsightFace API returned status ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return result;
}
