import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fetchAndStoreJobs, mapJobicyJob } from "../services/jobFetchService.js";

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
