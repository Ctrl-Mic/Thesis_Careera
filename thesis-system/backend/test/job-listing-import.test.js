import assert from "node:assert/strict";
import test from "node:test";
import { parseListingCsv } from "../../frontend/src/services/listingCsv.js";
import { importJobListings } from "../services/jobListingImportService.js";

const validListing = {
  title: "Tour Guide",
  company: "Island Tours",
  location: "Cebu",
  description: "Lead visitor tours.",
  listing_type: "job",
  external_url: "https://example.com/tour-guide",
};

function createMockDatabase() {
  const records = new Map();
  const statements = [];
  return {
    records,
    statements,
    async $queryRaw(strings, ...values) {
      statements.push(strings.join("?"));
      assert.match(
        strings.join(" "),
        /ON CONFLICT \("external_url"\)\s+WHERE "source" = 'manual' AND "external_url" IS NOT NULL\s+DO UPDATE/,
      );
      const key = `manual:${values[0]}`;
      const inserted = !records.has(key);
      records.set(key, values);
      return [{ inserted }];
    },
  };
}

test("imports and updates valid listings, rejects invalid rows, and rebuilds vectors", async () => {
  const database = createMockDatabase();
  let rebuildCount = 0;
  const rows = [
    validListing,
    { ...validListing, title: "Updated Tour Guide" },
    { ...validListing, listing_type: "internship" },
    { ...validListing, external_url: "not a URL" },
    { ...validListing, description: " " },
  ];

  const result = await importJobListings(rows, {
    database,
    rebuildVectors: async ({ database: rebuildDatabase }) => {
      assert.equal(rebuildDatabase, database);
      assert.equal(database.records.size, 1);
      rebuildCount += 1;
      return { listingCount: database.records.size };
    },
  });

  assert.deepEqual(result, {
    inserted: 1,
    updated: 1,
    rejected: [
      { row: 4, reason: "listing_type must be either job or practicum." },
      { row: 5, reason: "external_url must be a valid HTTP or HTTPS URL." },
      { row: 6, reason: "description is required." },
    ],
    listingVectors: { listingCount: 1 },
  });
  assert.equal(rebuildCount, 1);
  const storedValues = database.records.get(`manual:${validListing.external_url}`);
  assert.equal(storedValues[0], validListing.external_url);
  assert.equal(storedValues[1], "Updated Tour Guide");
  assert.equal(storedValues[5], "job");
});

test("reports vector rebuild failures after listing rows are saved", async () => {
  const database = createMockDatabase();

  await assert.rejects(
    importJobListings([validListing], {
      database,
      rebuildVectors: async () => {
        throw new Error("database unavailable");
      },
    }),
    (error) => (
      error.message === "Listings were processed, but rebuilding listing skill vectors failed."
      && error.cause?.message === "database unavailable"
    ),
  );
  assert.equal(database.records.size, 1);
});

test("parses CSV headers, quoted commas, and quoted newlines", () => {
  const csv = [
    "title,company,location,description,listing_type,external_url",
    '"Tour Guide, Senior",Island Tours,Cebu,"Lead tours',
    'for visiting groups.",practicum,https://example.com/tour-guide',
  ].join("\r\n");

  assert.deepEqual(parseListingCsv(csv), [{
    ...validListing,
    title: "Tour Guide, Senior",
    description: "Lead tours\r\nfor visiting groups.",
    listing_type: "practicum",
    _rowNumber: 2,
  }]);
});

test("rejects CSV files with missing columns or malformed quoting", () => {
  assert.throws(
    () => parseListingCsv("title,company\nGuide,Island Tours"),
    /missing required columns: location, description, listing_type, external_url/,
  );
  assert.throws(
    () => parseListingCsv('title,company,location,description,listing_type,external_url\n"unfinished'),
    /unclosed quoted field/,
  );
});

test("preserves CSV source row numbers when blank lines are skipped", () => {
  const csv = [
    "title,company,location,description,listing_type,external_url",
    "",
    "Tour Guide,Island Tours,Cebu,Lead tours,job,https://example.com/tour-guide",
  ].join("\r\n");

  assert.deepEqual(parseListingCsv(csv), [{
    ...validListing,
    description: "Lead tours",
    _rowNumber: 3,
  }]);
});
