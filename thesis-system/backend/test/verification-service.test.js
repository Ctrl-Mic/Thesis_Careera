import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidFaceVector,
  matchesFace,
  nameAppearsInText,
  normalizeName,
  parseImageDataUrl,
  removePendingFaceVector,
  getPendingFaceVector,
  requestFaceAnalysis,
  setPendingFaceVector,
} from "../services/verificationService.js";

test("parses only supported image data URLs within the size limit", () => {
  assert.deepEqual(parseImageDataUrl("data:image/png;base64,aGVsbG8="), {
    base64: "aGVsbG8=",
    byteLength: 5,
  });
  assert.equal(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(parseImageDataUrl("data:image/png;base64,not-valid"), null);
});

test("normalizes names and recognizes all registered name tokens in OCR text", () => {
  assert.equal(normalizeName("  Jane A. Doe "), "A DOE JANE");
  assert.equal(nameAppearsInText("Jane A. Doe", "Student name: DOE, JANE A."), true);
  assert.equal(nameAppearsInText("Jane A. Doe", "Student name: Jane Doe"), true);
});

test("matches names despite ordering, punctuation, and middle initial differences", () => {
  assert.equal(nameAppearsInText("Jane Anne Doe", "DOE, JANE A."), true);
  assert.equal(nameAppearsInText("DOE, JANE A.", "Jane Doe"), true);
  assert.equal(nameAppearsInText("Jane Anne Doe", "Jane X Doe"), true);
  assert.equal(nameAppearsInText("Jane Anne Doe", "John X Doe"), false);
  assert.equal(nameAppearsInText("Jane Anne Doe", "Jane X Smith"), false);
});

test("validates 512-value face embeddings and compares cosine similarity", () => {
  const reference = Array.from({ length: 512 }, (_, index) => (index === 0 ? 1 : 0));
  const matching = [...reference];
  const different = Array.from({ length: 512 }, (_, index) => (index === 1 ? 1 : 0));

  assert.equal(isValidFaceVector(reference), true);
  assert.equal(isValidFaceVector([1, 2, 3]), false);
  assert.equal(matchesFace(reference, matching), true);
  assert.equal(matchesFace(reference, different), false);
});

test("stores and removes pending ID face vectors", () => {
  const vector = Array.from({ length: 512 }, (_, index) => (index === 0 ? 1 : 0));
  setPendingFaceVector("verification-test-user", vector);

  assert.equal(getPendingFaceVector("verification-test-user"), vector);
  removePendingFaceVector("verification-test-user");
  assert.equal(getPendingFaceVector("verification-test-user"), null);
});

test("includes upstream metadata when the InsightFace response is not JSON", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.INSIGHTFACE_API_KEY;
  process.env.INSIGHTFACE_API_KEY = "verification-test-key";
  globalThis.fetch = async () => new Response("<html>Unavailable</html>", {
    status: 502,
    headers: { "content-type": "text/html" },
  });

  try {
    await assert.rejects(
      requestFaceAnalysis("extract", "aGVsbG8="),
      (error) => {
        assert.equal(error.message, "InsightFace API returned a non-JSON response.");
        assert.equal(error.status, 502);
        assert.equal(error.contentType, "text/html");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.INSIGHTFACE_API_KEY;
    } else {
      process.env.INSIGHTFACE_API_KEY = originalApiKey;
    }
  }
});
