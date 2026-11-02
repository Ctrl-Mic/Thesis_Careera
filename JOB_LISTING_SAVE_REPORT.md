# Job listing save flow: current Jobicy-style implementation

This document explains how the project currently saves new job listings fetched from the Jobicy API, and how the same save pattern is reused for imported/manual listings.

## 1) High-level behavior

The app does not store live Jobicy results in the browser. It fetches remote jobs server-side from the backend, normalizes them, and writes them into PostgreSQL through Prisma raw SQL.

The main flow is:
1. Admin calls an authenticated backend endpoint.
2. The backend sends a request to the Jobicy API.
3. The response is mapped into a normalized job object.
4. The job is inserted or updated in `job_listings`.
5. Listing skill vectors are rebuilt so recommendation logic can compare jobs to user skills.

## 2) Main files involved

- `thesis-system/backend/routes/admin.js`
- `thesis-system/backend/services/jobFetchService.js`
- `thesis-system/backend/services/listingVectorService.js`
- `thesis-system/backend/services/jobListingImportService.js`
- `thesis-system/prisma/schema.prisma`

## 3) API endpoint that triggers the fetch

`admin.js` exposes:

- `POST /api/admin/jobs/fetch`

Important behaviors:
- Requires admin auth.
- Accepts either:
  - `{ "keywords": "front desk", "location": "Philippines" }` for one fetch
  - `{ "refreshAll": true }` for all configured default keywords
- Returns JSON with counts like `fetched`, `inserted`, `updated`, and `listingVectors` summary.

The route delegates to `fetchAndStoreJobs(...)` or `fetchAllConfiguredJobs(...)`.

## 4) Jobicy request preparation

In `jobFetchService.js`, the fetch URL is built as:

- base: `https://jobicy.com/api/v2/remote-jobs`
- query params:
  - `count`: result limit
  - `tag`: normalized keyword string
  - `geo`: location string

Example:

```js
const url = new URL(JOBICY_API_URL);
url.searchParams.set("count", String(resultLimit));
url.searchParams.set("tag", normalizeSearchTerm(keywords));
url.searchParams.set("geo", location.trim());
```

Normalization is intentionally simple and low-risk:

```js
return value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-+/g, "-");
```

This turns a keyword like `"Front Desk"` into a Jobicy-friendly tag format.

## 5) Mapping Jobicy payload into app format

The function `mapJobicyJob(job)` converts raw Jobicy fields into app fields.

It reads fields like:
- `job.jobTitle` -> `title`
- `job.companyName` -> `company`
- `job.jobGeo` -> `location`
- `job.jobDescription` or `job.jobExcerpt` -> `description`
- `job.jobType` -> `jobType`
- `job.salary` -> `salary`
- `job.url` -> `externalUrl`
- `job.pubDate`, `job.updated`, `job.date` -> `postedAt`

It also handles missing values with defaults.

Example:

```js
const mappedFields = {
  title: asText(job.jobTitle) ?? "Untitled role",
  company: asText(job.companyName),
  location: asText(job.jobGeo),
  description: descriptions[0] ?? null,
  jobType: Array.isArray(job.jobType)
    ? job.jobType.map(asText).filter(Boolean).join(", ") || null
    : asText(job.jobType),
  salary: asText(job.salary),
  externalUrl: asText(job.url),
  postedAt: parsePostedAt(job),
};
```

The output object is:

```js
return {
  source: "jobicy",
  externalId: stableExternalId(job, mappedFields),
  ...mappedFields,
  rawPayload: job,
};
```

## 6) Stable identity for deduplication

Each Jobicy item gets a unique external ID.

The logic is:
- first use `job.id` or `job.jobId`
- otherwise compute an SHA1 hash of the URL or fallback title/company/location text

```js
function stableExternalId(job, mappedFields) {
  const id = asText(job.id ?? job.jobId);
  if (id) return id;

  const identity = mappedFields.externalUrl
    || [mappedFields.title, mappedFields.company ?? "", mappedFields.location ?? ""].join("\n");

  return createHash("sha1").update(identity).digest("hex");
}
```

This prevents duplicate records when Jobicy returns slightly different data or when no numeric ID is present.

## 7) Upsert logic in PostgreSQL

The actual database write happens in `upsertListing(...)` using a raw SQL `INSERT ... ON CONFLICT ... DO UPDATE`.

Relevant uniqueness:
- `job_listings` has a composite unique constraint on `(source, external_id)`

The raw SQL writes these fields:
- source
- external_id
- title
- company
- location
- description
- job_type
- salary
- external_url
- posted_at
- raw_payload
- fetched_at
- is_active

The conflict update refreshes the record so newer Jobicy values overwrite stale data.

```sql
INSERT INTO "job_listings" (
  "source", "external_id", "title", "company", "location", "description",
  "job_type", "salary", "external_url", "posted_at", "raw_payload",
  "fetched_at", "is_active"
)
VALUES (...)
ON CONFLICT ("source", "external_id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "company" = EXCLUDED."company",
  "location" = EXCLUDED."location",
  "description" = EXCLUDED."description",
  "job_type" = EXCLUDED."job_type",
  "salary" = EXCLUDED."salary",
  "external_url" = EXCLUDED."external_url",
  "posted_at" = EXCLUDED."posted_at",
  "raw_payload" = EXCLUDED."raw_payload",
  "fetched_at" = NOW(),
  "is_active" = TRUE
RETURNING ("xmax" = 0) AS inserted
```

The `RETURNING` value tells the app whether the row was inserted or updated.

## 8) How fetch counts are computed

`fetchAndStoreJobs(...)` loops through each Jobicy item:

```js
for (const job of data.jobs) {
  const result = await upsertListing(database, mapJobicyJob(job));
  if (result[0]?.inserted) inserted += 1;
  else updated += 1;
}
```

Then it calls `rebuildListingVectors({ database })` and returns:

```js
return { fetched: data.jobs.length, inserted, updated, listingVectors };
```

## 9) Refresh-all behavior

`fetchAllConfiguredJobs(...)` loops through `DEFAULT_JOB_KEYWORDS` and calls `fetchAndStoreJobs(...)` for each keyword.

It waits between requests using `JOB_FETCH_DELAY_MS`, so the app does not hammer Jobicy too hard.

Important details:
- totals are accumulated across all keywords
- a final call to `rebuildListingVectors` runs once after the whole refresh cycle
- it rebuilds all listing vectors after all Jobicy requests complete

## 10) Why listing vectors are rebuilt

The app uses `ListingSkill` and `SkillIdf` tables to match jobs to users.

The schema includes:
- `job_listings`
- `listing_skill`
- `skill_idf`

The rebuild function does the following:

1. Load all skills from `skill_dictionary`
2. Load all listings from `job_listings`
3. Extract skill matches from each listing title + description using `extractSkills(...)`
4. Compute document frequency for each skill across all listings
5. Compute TF-IDF-like scores for each listing-skill pair
6. Store rows in `listing_skill` and `skill_idf`

This enables recommendation matching later.

## 11) Manual listing import uses the same pattern

`jobListingImportService.js` uses a similar `INSERT ... ON CONFLICT ... DO UPDATE` strategy, but for manually created listings.

It validates CSV or JSON rows and requires:
- `title`
- `company`
- `location`
- `description`
- `listing_type`
- `external_url`

Then it writes records with:
- `source = 'manual'`
- `external_id = external_url`
- unique conflict check effective on `external_url`

This means manual entries can be re-imported and updated without duplicates.

## 12) Current architecture summary

The current system is a server-side synchronization pipeline:

```text
Admin request
  -> admin route
  -> fetchAndStoreJobs / fetchAllConfiguredJobs
  -> Jobicy API request
  -> mapJobicyJob()
  -> upsertListing() raw SQL
  -> job_listings table
  -> rebuildListingVectors()
  -> listing_skill + skill_idf tables
  -> recommendation logic can use the updated data
```

This is a solid “sync remote job listings into PostgreSQL” pattern, but it is not a full event-driven importer. It is a straightforward scheduled/manual refresh system.

## 13) Practical interpretation

If someone asks what currently happens when a new Jobicy listing is saved, the answer is:

- the backend fetches Jobicy results from the remote API
- it normalizes the fields
- it assigns a source and stable external identifier
- it performs an upsert into `job_listings`
- it updates or replaces the row if the same listing already exists
- it rebuilds the vector tables so recommendation scoring uses the latest listing metadata

## 14) Key takeaway

The app currently treats Jobicy as a source of remote job records, then makes those records part of the internal PostgreSQL dataset. The remote API is not the application’s primary data source for recommendation logic; it is a sync source that writes into the local database and then recomputes vectors from that local database.
