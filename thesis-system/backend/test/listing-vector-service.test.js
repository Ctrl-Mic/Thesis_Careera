import assert from "node:assert/strict";
import test from "node:test";
import { rebuildListingVectors } from "../services/listingVectorService.js";

const fixtureSkills = [
  { skillId: "TS001", canonicalSkill: "Customer Service", synonyms: "" },
  { skillId: "TS002", canonicalSkill: "Tour Guiding", synonyms: "" },
  { skillId: "TS003", canonicalSkill: "Event Planning", synonyms: "" },
];

const fixtureListings = [
  { listingId: 1, title: "Customer Service", description: "Customer Service" },
  { listingId: 2, title: "Customer Service", description: "Tour Guiding" },
  { listingId: 3, title: "Office Assistant", description: "Manage daily records" },
];

function createMockDatabase() {
  const state = { listingSkills: [], skillIdfs: [] };
  return {
    state,
    async $transaction(callback) {
      const pending = {
        listingSkills: [...state.listingSkills],
        skillIdfs: [...state.skillIdfs],
      };
      const transaction = {
        skillDictionary: {
          async findMany() {
            return fixtureSkills;
          },
        },
        jobListing: {
          async findMany() {
            return fixtureListings;
          },
        },
        listingSkill: {
          async deleteMany() {
            pending.listingSkills = [];
          },
          async createMany({ data }) {
            pending.listingSkills.push(...data);
          },
        },
        skillIdf: {
          async deleteMany() {
            pending.skillIdfs = [];
          },
          async createMany({ data }) {
            pending.skillIdfs.push(...data);
          },
        },
      };
      const result = await callback(transaction);
      state.listingSkills = pending.listingSkills;
      state.skillIdfs = pending.skillIdfs;
      return result;
    },
  };
}

function closeTo(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} differs from ${expected}`);
}

test("rebuilds listing TF-IDF vectors and IDF rows for all dictionary skills", async () => {
  const database = createMockDatabase();
  const result = await rebuildListingVectors({ database });

  const sharedIdf = Math.log(4 / 3) + 1;
  const singleListingIdf = Math.log(4 / 2) + 1;
  const absentIdf = Math.log(4 / 1) + 1;
  const doubleTermFrequency = 1 + Math.log(2);

  assert.equal(result.listingCount, 3);
  assert.equal(result.zeroMatchedListingCount, 1);
  assert.equal(result.averageTextLength, 33);
  assert.equal(result.minimumTextLength, 29);
  assert.equal(result.listingSkillCount, 3);
  assert.equal(result.skillIdfCount, 3);
  assert.deepEqual(
    database.state.listingSkills.map(({ listingId, skillId, termCount }) => ({
      listingId,
      skillId,
      termCount,
    })),
    [
      { listingId: 1, skillId: "TS001", termCount: 2 },
      { listingId: 2, skillId: "TS001", termCount: 1 },
      { listingId: 2, skillId: "TS002", termCount: 1 },
    ],
  );
  closeTo(database.state.listingSkills[0].tfidf, doubleTermFrequency * sharedIdf);
  closeTo(database.state.listingSkills[1].tfidf, sharedIdf);
  closeTo(database.state.listingSkills[2].tfidf, singleListingIdf);
  closeTo(database.state.skillIdfs[0].idf, sharedIdf);
  closeTo(database.state.skillIdfs[1].idf, singleListingIdf);
  closeTo(database.state.skillIdfs[2].idf, absentIdf);
  assert.deepEqual(database.state.skillIdfs.map(({ docFreq }) => docFreq), [2, 1, 0]);
  assert.deepEqual(result.skillsWithoutListings, [
    { skillId: "TS003", skill: "Event Planning" },
  ]);

  const firstResultRows = database.state.listingSkills.map(({ listingId, skillId, termCount, tfidf }) => ({
    listingId,
    skillId,
    termCount,
    tfidf,
  }));
  const firstIdfRows = database.state.skillIdfs.map(({ skillId, docFreq, idf }) => ({
    skillId,
    docFreq,
    idf,
  }));
  await rebuildListingVectors({ database });
  assert.deepEqual(
    database.state.listingSkills.map(({ listingId, skillId, termCount, tfidf }) => ({
      listingId,
      skillId,
      termCount,
      tfidf,
    })),
    firstResultRows,
  );
  assert.deepEqual(
    database.state.skillIdfs.map(({ skillId, docFreq, idf }) => ({
      skillId,
      docFreq,
      idf,
    })),
    firstIdfRows,
  );
});
