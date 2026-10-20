import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import process from "node:process";
import test from "node:test";
import prisma from "../lib/prisma.js";
import { createJobListingsRouter } from "../routes/jobListings.js";
import { createRecommendationsRouter } from "../routes/recommendations.js";
import { cosine, computeRecommendations } from "../services/recommendationService.js";
import { createAuthToken } from "../services/sessionService.js";

const profiles = [
  { skillId: "TS001", finalWeight: 0.6 },
  { skillId: "TS002", finalWeight: 0.59 },
];

const idfs = [
  { skillId: "TS001", idf: 1 },
  { skillId: "TS002", idf: 1 },
  { skillId: "TS003", idf: 1 },
];

const listings = [
  {
    listingId: 1,
    title: "Customer Service Job",
    company: "One",
    location: "Cebu",
    externalUrl: "https://example.test/1",
    listingType: "job",
    listingSkills: [
      { skillId: "TS001", tfidf: 1, skill: { canonicalSkill: "Customer Service" } },
    ],
  },
  {
    listingId: 2,
    title: "Tour Guiding Job",
    company: "Two",
    location: "Manila",
    externalUrl: "https://example.test/2",
    listingType: "job",
    listingSkills: [
      { skillId: "TS002", tfidf: 1, skill: { canonicalSkill: "Tour Guiding" } },
    ],
  },
  {
    listingId: 3,
    title: "Tourism Practicum",
    company: "Three",
    location: "Cebu",
    externalUrl: "https://example.test/3",
    listingType: "practicum",
    listingSkills: [
      { skillId: "TS001", tfidf: 0.6, skill: { canonicalSkill: "Customer Service" } },
      { skillId: "TS002", tfidf: 0.59, skill: { canonicalSkill: "Tour Guiding" } },
    ],
  },
  {
    listingId: 4,
    title: "No Skills Listing",
    company: "Four",
    location: "Cebu",
    externalUrl: "https://example.test/4",
    listingType: "practicum",
    listingSkills: [],
  },
];

function createDatabase({
  attempt = { attemptId: "assessment-1" },
  userProfiles = profiles,
  skillIdfs = idfs,
  jobListings = listings,
  user = { id: "user-1" },
} = {}) {
  const state = { recommendations: [] };
  const transaction = {
    assessmentAttempt: {
      async findFirst() {
        return attempt;
      },
    },
    userSkillProfile: {
      async findMany() {
        return userProfiles;
      },
    },
    skillIdf: {
      async findMany() {
        return skillIdfs;
      },
    },
    jobListing: {
      async findMany({ where }) {
        return jobListings.filter((listing) => (
          (!where.location || listing.location.toLowerCase().includes(
            where.location.contains.toLowerCase(),
          ))
          && (!where.listingType || listing.listingType === where.listingType)
        ));
      },
    },
    recommendation: {
      async deleteMany() {
        state.recommendations = [];
      },
      async createMany({ data }) {
        state.recommendations.push(...data);
      },
    },
  };
  return {
    state,
    user: {
      async findUnique() {
        return user;
      },
    },
    async $transaction(callback) {
      return callback(transaction);
    },
  };
}

function closeTo(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);
}

test("cosine returns 1 for identical and 0 for orthogonal or empty vectors", () => {
  closeTo(cosine({ TS001: 1, TS002: 2 }, { TS001: 1, TS002: 2 }), 1);
  assert.equal(cosine({ TS001: 1 }, { TS002: 1 }), 0);
  assert.equal(cosine({}, { TS001: 1 }), 0);
  assert.equal(cosine({ TS001: 1 }, {}), 0);
});

test("ranks four listings by hand-computed cosine, gaps, readiness, and persists results", async () => {
  const database = createDatabase();
  const { results } = await computeRecommendations(
    "user-1",
    { limit: 4 },
    database,
  );
  const userNorm = Math.sqrt(0.6 ** 2 + 0.59 ** 2);

  assert.deepEqual(results.map(({ listing_id }) => listing_id), [3, 1, 2, 4]);
  closeTo(results[0].match_score, 1);
  assert.equal(results[0].match_percent, 100);
  closeTo(results[1].match_score, 0.6 / userNorm);
  assert.equal(results[1].match_percent, Math.round((0.6 / userNorm) * 100));
  closeTo(results[2].match_score, 0.59 / userNorm);
  assert.equal(results[3].match_score, 0);
  assert.equal(results[0].readiness_pct, 50);
  assert.deepEqual(results[0].gaps, [{
    skill_id: "TS002",
    name: "Tour Guiding",
    listing_weight: 0.59,
    user_weight: 0.59,
  }]);
  assert.equal(results[1].readiness_pct, 100);
  assert.deepEqual(results[1].gaps, []);
  assert.equal(results[2].readiness_pct, 0);
  assert.equal(results[3].readiness_pct, null);
  assert.equal(database.state.recommendations.length, 4);
  assert.equal(database.state.recommendations[3].readinessPct, null);
});

test("applies location and listing type filters and excludes zero matches when enough matches exist", async () => {
  const database = createDatabase();
  const { results } = await computeRecommendations(
    "user-1",
    { limit: 2, location: "cebU", type: "practicum" },
    database,
  );

  assert.deepEqual(results.map(({ listing_id }) => listing_id), [3, 4]);
  const limited = await computeRecommendations("user-1", { limit: 1 }, database);
  assert.deepEqual(limited.results.map(({ listing_id }) => listing_id), [3]);
  assert.equal(database.state.recommendations.length, 1);
});

test("returns only the ten highest-weight gaps", async () => {
  const manySkills = Array.from({ length: 11 }, (_, index) => ({
    skillId: `TS${String(index + 1).padStart(3, "0")}`,
    tfidf: index + 1,
    skill: { canonicalSkill: `Skill ${index + 1}` },
  }));
  const userProfiles = [{ skillId: "TS001", finalWeight: 0.6 }];
  const skillIdfs = manySkills.map(({ skillId }) => ({ skillId, idf: 1 }));
  const database = createDatabase({
    userProfiles,
    skillIdfs,
    jobListings: [{ ...listings[0], listingSkills: manySkills }],
  });
  const { results } = await computeRecommendations("user-1", {}, database);

  assert.equal(results[0].gaps.length, 10);
  assert.deepEqual(results[0].gaps.map(({ listing_weight }) => listing_weight), [
    11, 10, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
});

test("returns NO_PROFILE and clears old recommendations when assessment or nonzero weights are absent", async () => {
  const noAttemptDatabase = createDatabase({ attempt: null });
  noAttemptDatabase.state.recommendations.push({ listingId: 99 });
  assert.deepEqual(
    await computeRecommendations("user-1", {}, noAttemptDatabase),
    { code: "NO_PROFILE", results: [] },
  );
  assert.deepEqual(noAttemptDatabase.state.recommendations, []);

  const zeroWeightDatabase = createDatabase({
    userProfiles: [{ skillId: "TS001", finalWeight: 0 }],
  });
  assert.deepEqual(
    await computeRecommendations("user-1", {}, zeroWeightDatabase),
    { code: "NO_PROFILE", results: [] },
  );
});

test("authenticated recommendations endpoint returns NO_PROFILE with HTTP 200", async (context) => {
  const database = createDatabase({ attempt: null });
  const app = express();
  app.use("/api", createRecommendationsRouter({ database }));
  const server = app.listen(0, "127.0.0.1");
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`, {
    headers: { Authorization: `Bearer ${createAuthToken("user-1")}` },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { code: "NO_PROFILE", results: [] });
});

test("job listings endpoint returns active database listings in a frontend-friendly shape", async (context) => {
  const database = {
    jobListing: {
      async findMany({ where, orderBy, select }) {
        assert.equal(where.isActive, true);
        assert.equal(orderBy[0].fetchedAt, "desc");
        assert.equal(select.listingId, true);
        return [
          {
            listingId: 7,
            title: "Tour Guide",
            company: "Island Tours",
            location: "Cebu",
            listingType: "job",
            externalUrl: "https://example.com/guides/cebu",
            description: "Lead city tours.",
            jobType: "Full-time",
            salary: "₱25,000",
            source: "manual",
            listingSkills: [{ skill: { canonicalSkill: "Tourism" } }],
          },
          {
            listingId: 8,
            title: "Practicum Program",
            company: "Hotel Academy",
            location: "Manila",
            listingType: "practicum",
            externalUrl: "https://example.com/practicum",
            description: "Hands-on learning.",
            jobType: null,
            salary: null,
            source: "manual",
            listingSkills: [{ skill: { canonicalSkill: "Hospitality" } }],
          },
        ];
      },
    },
  };

  const app = express();
  app.use("/api", createJobListingsRouter({ database }));
  const server = app.listen(0, "127.0.0.1");
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/job-listings`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    jobs: [
      {
        id: 7,
        title: "Tour Guide",
        company: "Island Tours",
        location: "Cebu",
        employmentType: "Full-time",
        workType: "Remote",
        skills: ["Tourism"],
        summary: "Lead city tours.",
        url: "https://example.com/guides/cebu",
        logo: "",
        listingType: "job",
        source: "manual",
      },
      {
        id: 8,
        title: "Practicum Program",
        company: "Hotel Academy",
        location: "Manila",
        employmentType: "Not specified",
        workType: "Remote",
        skills: ["Hospitality"],
        summary: "Hands-on learning.",
        url: "https://example.com/practicum",
        logo: "",
        listingType: "practicum",
        source: "manual",
      },
    ],
  });
});

test("recommendations endpoint requires a valid signed-in user", async (context) => {
  const database = createDatabase();
  const app = express();
  app.use("/api", createRecommendationsRouter({ database }));
  const server = app.listen(0, "127.0.0.1");
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`);

  assert.equal(response.status, 401);
});

test("writes recommendation rows to PostgreSQL and persists null readiness", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not configured",
}, async () => {
  const userId = randomUUID();
  const externalId = randomUUID();
  const source = "recommendation-service-test";
  let listingId;

  try {
    await prisma.$connect();
    const idf = await prisma.skillIdf.findFirst({
      select: { skillId: true },
    });
    assert.ok(idf, "the skill IDF table must be populated");

    await prisma.user.create({ data: { id: userId } });
    await prisma.assessmentAttempt.create({
      data: { attemptId: randomUUID(), userId },
    });
    await prisma.userSkillProfile.create({
      data: {
        userId,
        skillId: idf.skillId,
        assessmentWeight: 0.8,
        finalWeight: 0.8,
        updatedAt: new Date(),
      },
    });
    const listing = await prisma.jobListing.create({
      data: {
        source,
        externalId,
        title: "Recommendation persistence fixture",
        location: `recommendation-test-${userId}`,
        listingType: "practicum",
        listingSkills: {
          create: { skillId: idf.skillId, termCount: 1, tfidf: 1 },
        },
      },
      select: { listingId: true },
    });
    listingId = listing.listingId;

    const { results } = await computeRecommendations(userId, {
      location: `recommendation-test-${userId}`,
      type: "practicum",
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].listing_id, listingId);
    assert.equal(results[0].readiness_pct, 100);

    const persisted = await prisma.recommendation.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    assert.ok(persisted);
    assert.equal(persisted.matchScore, results[0].match_score);

    await prisma.listingSkill.deleteMany({ where: { listingId } });
    const emptyListingResults = await computeRecommendations(userId, {
      location: `recommendation-test-${userId}`,
      type: "practicum",
    });
    assert.equal(emptyListingResults.results[0].readiness_pct, null);
    const persistedNullReadiness = await prisma.recommendation.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    assert.equal(persistedNullReadiness.readinessPct, null);
  } finally {
    if (listingId !== undefined) {
      await prisma.jobListing.deleteMany({ where: { listingId } });
    }
    await prisma.user.deleteMany({ where: { id: userId } });
  }
});
