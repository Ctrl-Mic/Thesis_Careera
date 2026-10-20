import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_JOB_KEYWORDS, DEFAULT_JOB_LOCATION, DEFAULT_JOB_RESULT_LIMIT, JOB_FETCH_DELAY_MS } from "../config/jobFetchConfig.js";
import {
  fetchAllConfiguredJobs,
  fetchAndStoreJobs,
  mapJobicyJob,
} from "../services/jobFetchService.js";

const fixture = JSON.parse(await readFile(
  new URL("./fixtures/jobicy-jobs.json", import.meta.url),
  "utf8",
));

function createMockDatabase() {
  const records = new Map();
  const statements = [];
  return {
    records,
    statements,
    async $queryRaw(strings, ...values) {
      const statement = strings.join("$");
      statements.push(statement);
      assert.match(statement, /ON CONFLICT \("source", "external_id"\) DO UPDATE/);
      assert.match(statement, /"fetched_at" = NOW\(\)/);
      assert.match(statement, /"is_active" = TRUE/);
      const key = `${values[0]}:${values[1]}`;
      const inserted = !records.has(key);
      records.set(key, values);
      return [{ inserted }];
    },
  };
}

function createMockFetch() {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: new URL(url), options });
    return new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchImpl, requests };
}

test("fetchAndStoreJobs inserts then updates every fixture row without duplicates", async () => {
  const database = createMockDatabase();
  const { fetchImpl, requests } = createMockFetch();
  let rebuildCount = 0;
  const dependencies = {
    database,
    fetchImpl,
    rebuildVectors: async ({ database: rebuildDatabase }) => {
      assert.equal(rebuildDatabase, database);
      assert.equal(database.records.size, 5);
      rebuildCount += 1;
      return { listingCount: database.records.size };
    },
  };
  const request = { keywords: "front desk", location: "Philippines" };

  assert.deepEqual(await fetchAndStoreJobs(request, dependencies), {
    fetched: 5,
    inserted: 5,
    updated: 0,
    listingVectors: { listingCount: 5 },
  });
  assert.deepEqual(await fetchAndStoreJobs(request, dependencies), {
    fetched: 5,
    inserted: 0,
    updated: 5,
    listingVectors: { listingCount: 5 },
  });
  assert.equal(rebuildCount, 2);
  assert.equal(database.records.size, 5);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.origin + requests[0].url.pathname, "https://jobicy.com/api/v2/remote-jobs");
  assert.deepEqual(Object.fromEntries(requests[0].url.searchParams), {
    count: "50",
    tag: "front-desk",
    geo: "Philippines",
  });
  assert.deepEqual(
    JSON.parse(database.records.get("jobicy:78901")[10]),
    fixture.jobs[0],
  );
  assert.equal(requests[0].options.headers.Accept, "application/json");
  assert.equal(requests[0].options.method, undefined);
});

test("reports a vector rebuild failure after saving fetched listings", async () => {
  const database = createMockDatabase();
  const { fetchImpl } = createMockFetch();

  await assert.rejects(
    fetchAndStoreJobs(
      { keywords: "front desk", location: "Philippines" },
      {
        database,
        fetchImpl,
        rebuildVectors: async () => {
          throw new Error("database unavailable");
        },
      },
    ),
    (error) => (
      error.message === "Jobs were saved, but rebuilding listing skill vectors failed."
      && error.cause?.message === "database unavailable"
    ),
  );
  assert.equal(database.records.size, 5);
});

test("refreshes all configured keywords with one vector rebuild and idempotent upserts", async () => {
  const database = createMockDatabase();
  const { fetchImpl, requests } = createMockFetch();
  const delays = [];
  let rebuildCount = 0;
  const dependencies = {
    database,
    fetchImpl,
    wait: async (milliseconds) => delays.push(milliseconds),
    rebuildVectors: async ({ database: rebuildDatabase }) => {
      assert.equal(rebuildDatabase, database);
      assert.equal(database.records.size, 5);
      rebuildCount += 1;
      return { listingCount: database.records.size };
    },
  };

  assert.deepEqual(await fetchAllConfiguredJobs(dependencies), {
    fetched: DEFAULT_JOB_KEYWORDS.length * fixture.jobs.length,
    inserted: fixture.jobs.length,
    updated: (DEFAULT_JOB_KEYWORDS.length - 1) * fixture.jobs.length,
    listingVectors: { listingCount: fixture.jobs.length },
  });
  assert.deepEqual(await fetchAllConfiguredJobs(dependencies), {
    fetched: DEFAULT_JOB_KEYWORDS.length * fixture.jobs.length,
    inserted: 0,
    updated: DEFAULT_JOB_KEYWORDS.length * fixture.jobs.length,
    listingVectors: { listingCount: fixture.jobs.length },
  });
  assert.equal(requests.length, DEFAULT_JOB_KEYWORDS.length * 2);
  assert.deepEqual(
    requests.slice(0, DEFAULT_JOB_KEYWORDS.length).map(({ url }) => [
      url.searchParams.get("tag"),
      url.searchParams.get("geo"),
      url.searchParams.get("count"),
    ]),
    DEFAULT_JOB_KEYWORDS.map((keyword) => [
      keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      DEFAULT_JOB_LOCATION,
      String(DEFAULT_JOB_RESULT_LIMIT),
    ]),
  );
  assert.equal(delays.length, (DEFAULT_JOB_KEYWORDS.length - 1) * 2);
  assert.ok(delays.every((milliseconds) => milliseconds === JOB_FETCH_DELAY_MS));
  assert.equal(rebuildCount, 2);
  assert.equal(database.records.size, fixture.jobs.length);
});

test("does not rebuild listing vectors when the first configured keyword fetch fails", async () => {
  const database = createMockDatabase();
  let rebuildCount = 0;

  await assert.rejects(
    fetchAllConfiguredJobs({
      database,
      fetchImpl: async () => new Response("", { status: 503 }),
      wait: async () => {
        throw new Error("delay should not run before the first request succeeds");
      },
      rebuildVectors: async () => {
        rebuildCount += 1;
        return { listingCount: 0 };
      },
    }),
    /Jobicy API error: 503/,
  );
  assert.equal(database.records.size, 0);
  assert.equal(rebuildCount, 0);
});

test("reports a vector rebuild failure after refreshing configured keywords", async () => {
  const database = createMockDatabase();
  const { fetchImpl } = createMockFetch();

  await assert.rejects(
    fetchAllConfiguredJobs({
      database,
      fetchImpl,
      wait: async () => undefined,
      rebuildVectors: async () => {
        throw new Error("database unavailable");
      },
    }),
    (error) => (
      error.message === "Jobs were saved, but rebuilding listing skill vectors failed."
      && error.cause?.message === "database unavailable"
    ),
  );
  assert.equal(database.records.size, fixture.jobs.length);
});

test("rebuilds vectors for saved jobs before reporting a later category fetch failure", async () => {
  const database = createMockDatabase();
  const delays = [];
  let requestCount = 0;
  let rebuildCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Response(JSON.stringify(fixture), { status: 200 });
    }
    return new Response("", { status: 503 });
  };

  await assert.rejects(
    fetchAllConfiguredJobs({
      database,
      fetchImpl,
      wait: async (milliseconds) => delays.push(milliseconds),
      rebuildVectors: async () => {
        rebuildCount += 1;
        return { listingCount: database.records.size };
      },
    }),
    /Jobicy API error: 503/,
  );
  assert.equal(requestCount, 2);
  assert.deepEqual(delays, [JOB_FETCH_DELAY_MS]);
  assert.equal(database.records.size, fixture.jobs.length);
  assert.equal(rebuildCount, 1);
});

test("maps Jobicy fields, longest description, and stable IDs with nullable fields", () => {
  const [first, second, third, fourth, fifth] = fixture.jobs.map(mapJobicyJob);
  assert.equal(first.source, "jobicy");
  assert.equal(first.externalId, "78901");
  assert.equal(first.description, fixture.jobs[0].jobDescription);
  assert.equal(first.jobType, "Full-time, On-site");
  assert.equal(first.salary, "PHP 25,000-30,000");
  assert.equal(first.postedAt.toISOString(), "2026-10-10T08:30:00.000Z");
  assert.equal(first.rawPayload, fixture.jobs[0]);
  assert.equal(second.company, "Island Tours");
  assert.equal(second.postedAt, null);
  assert.equal(third.company, null);
  assert.equal(third.salary, null);
  assert.equal(third.postedAt, null);
  assert.equal(third.externalId, "59aaea3bfc237bd10da81294ffba9a7e67c9bd8b");
  assert.equal(fourth.postedAt.toISOString(), "2026-10-12T00:00:00.000Z");
  assert.equal(fifth.externalId, "e429d04989dac430da46cb1e8724f24017da4391");
  assert.equal(fifth.salary, "1800");
});

test("validates search inputs and accepts the public API without an API key", async () => {
  await assert.rejects(
    fetchAndStoreJobs({ keywords: "", location: "Philippines" }),
    /keywords must be a non-empty string/,
  );
  await assert.rejects(
    fetchAndStoreJobs({ keywords: "tour guide", location: "" }),
    /location must be a non-empty string/,
  );
});
