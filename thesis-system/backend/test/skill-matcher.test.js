import assert from "node:assert/strict";
import test from "node:test";
import { extractSkills, findSkillMatches } from "../services/skillMatcher.js";

const skill = (skillId, canonicalSkill, synonyms = "") => ({
  skillId,
  canonicalSkill,
  synonyms,
});

test("matches case-insensitively and counts whole-word occurrences", () => {
  const skills = [skill("TS001", "Customer Service")];
  assert.deepEqual(
    extractSkills("CUSTOMER service, customer SERVICE!", skills),
    new Map([["TS001", 2]]),
  );
});

test("Porter stemming matches plural forms", () => {
  assert.deepEqual(
    extractSkills("Handled hotel reservations daily.", [
      skill("TS001", "Reservation"),
    ]),
    new Map([["TS001", 1]]),
  );
});

test("normalizes hyphens and slashes to phrase separators", () => {
  assert.deepEqual(
    extractSkills("Front-desk and guest/service work.", [
      skill("TS001", "Front desk"),
      skill("TS002", "Guest Service"),
    ]),
    new Map([["TS001", 1], ["TS002", 1]]),
  );
});

test("matches phrases contiguously and includes synonyms", () => {
  const matches = findSkillMatches(
    "Delivered guest complaint resolution and complaint handling. "
      + "Also handled guest service.",
    [skill("TS001", "Complaint Handling", "guest complaint resolution; guest service")],
  );
  assert.equal(matches.get("TS001").matchCount, 3);
  assert.deepEqual(matches.get("TS001").matchedTerms, [
    { term: "Complaint Handling", count: 1 },
    { term: "guest complaint resolution", count: 1 },
    { term: "guest service", count: 1 },
  ]);
});

test("does not match terms embedded in longer words", () => {
  assert.deepEqual(
    extractSkills("The departure was smooth.", [skill("TS001", "art")]),
    new Map(),
  );
});

test("matches short all-caps acronyms case-sensitively as whole words", () => {
  assert.deepEqual(
    extractSkills("Used CRS and GDS, but not crs or XGDS.", [
      skill("TS001", "CRS"),
      skill("TS002", "GDS"),
    ]),
    new Map([["TS001", 1], ["TS002", 1]]),
  );
});

test("returns no matches for empty text", () => {
  assert.deepEqual(extractSkills("", [skill("TS001", "Customer Service")]), new Map());
});
