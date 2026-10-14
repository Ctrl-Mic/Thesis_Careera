import assert from "node:assert/strict";
import test from "node:test";
import {
  computeFinalWeight,
  rebuildUserSkillProfile,
} from "../services/skillProfileService.js";

const weightCases = [
  { base: 0, resume: false, certificate: false, expected: 0 },
  { base: 0, resume: true, certificate: false, expected: 0.2 },
  { base: 0, resume: false, certificate: true, expected: 0.2 },
  { base: 0, resume: true, certificate: true, expected: 0.4 },
  { base: 0.2, resume: false, certificate: false, expected: 0.2 },
  { base: 0.2, resume: true, certificate: false, expected: 0.4 },
  { base: 0.2, resume: false, certificate: true, expected: 0.4 },
  { base: 0.2, resume: true, certificate: true, expected: 0.6 },
  { base: 0.6, resume: false, certificate: false, expected: 0.6 },
  { base: 0.6, resume: true, certificate: false, expected: 0.8 },
  { base: 0.6, resume: false, certificate: true, expected: 0.8 },
  { base: 0.6, resume: true, certificate: true, expected: 1 },
  { base: 1, resume: false, certificate: false, expected: 1 },
  { base: 1, resume: true, certificate: false, expected: 1 },
  { base: 1, resume: false, certificate: true, expected: 1 },
  { base: 1, resume: true, certificate: true, expected: 1 },
];

for (const { base, resume, certificate, expected } of weightCases) {
  test(`computeFinalWeight(${base}, ${resume}, ${certificate}) = ${expected}`, () => {
    assert.ok(Math.abs(computeFinalWeight(base, resume, certificate) - expected) < 1e-12);
  });
}

test("rebuildUserSkillProfile leaves profiles unchanged without an assessment attempt", async () => {
  const database = {
    async $transaction(callback) {
      return callback({
        assessmentAttempt: { findFirst: async () => null },
        userSkillProfile: {
          upsert: async () => assert.fail("no profile rows should be changed"),
        },
      });
    },
  };

  assert.deepEqual(await rebuildUserSkillProfile("user-id", database), {
    rebuilt: false,
    reason: "no_assessment_attempt",
    skillCount: 0,
  });
});
