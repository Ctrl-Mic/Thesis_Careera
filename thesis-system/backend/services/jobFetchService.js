import { createHash } from "node:crypto";
import prisma from "../lib/prisma.js";
import {
  DEFAULT_JOB_KEYWORDS,
  DEFAULT_JOB_LOCATION,
  DEFAULT_JOB_RESULT_LIMIT,
  JOB_FETCH_DELAY_MS,
} from "../config/jobFetchConfig.js";
import { rebuildListingVectors } from "./listingVectorService.js";

const JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs";

function asText(value) {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return null;
}

function normalizeSearchTerm(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function parsePostedAt(job) {
  for (const value of [job.pubDate, job.updated, job.date]) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function stableExternalId(job, mappedFields) {
  const id = asText(job.id ?? job.jobId);
  if (id) return id;

  const identity = mappedFields.externalUrl
    || [mappedFields.title, mappedFields.company ?? "", mappedFields.location ?? ""].join("\n");
  return createHash("sha1").update(identity).digest("hex");
}

export function mapJobicyJob(job) {
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new Error("Jobicy returned a job that is not an object.");
  }

  const descriptions = [job.jobDescription, job.jobExcerpt]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .sort((left, right) => right.length - left.length);
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

  return {
    source: "jobicy",
    externalId: stableExternalId(job, mappedFields),
    ...mappedFields,
    rawPayload: job,
  };
}

async function upsertListing(database, listing) {
  return database.$queryRaw`
    INSERT INTO "job_listings" (
      "source", "external_id", "title", "company", "location", "description",
      "job_type", "salary", "external_url", "posted_at", "raw_payload",
      "fetched_at", "is_active"
    )
    VALUES (
      ${listing.source}, ${listing.externalId}, ${listing.title}, ${listing.company},
      ${listing.location}, ${listing.description}, ${listing.jobType}, ${listing.salary},
      ${listing.externalUrl}, ${listing.postedAt}, ${JSON.stringify(listing.rawPayload)}::jsonb,
      NOW(), TRUE
    )
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
  `;
}

export async function fetchAndStoreJobs(
  { keywords, location },
  {
    fetchImpl = fetch,
    database = prisma,
    rebuildVectors = rebuildListingVectors,
    resultLimit = DEFAULT_JOB_RESULT_LIMIT,
  } = {},
) {
  if (typeof keywords !== "string" || !keywords.trim()) {
    throw new Error("keywords must be a non-empty string.");
  }
  if (typeof location !== "string" || !location.trim()) {
    throw new Error("location must be a non-empty string.");
  }
  if (!Number.isInteger(resultLimit) || resultLimit < 1) {
    throw new Error("resultLimit must be a positive integer.");
  }

  const url = new URL(JOBICY_API_URL);
  url.searchParams.set("count", String(resultLimit));
  url.searchParams.set("tag", normalizeSearchTerm(keywords));
  url.searchParams.set("geo", location.trim());

  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Jobicy API request failed.");
  }

  if (!response.ok) {
    throw new Error(`Jobicy API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data || typeof data !== "object" || !Array.isArray(data.jobs)) {
    throw new Error("Jobicy API response did not include a jobs array.");
  }
  if (data.success === false) {
    throw new Error(data.message || "Jobicy API reported an unsuccessful response.");
  }

  let inserted = 0;
  let updated = 0;
  for (const job of data.jobs) {
    const result = await upsertListing(database, mapJobicyJob(job));
    if (result[0]?.inserted) inserted += 1;
    else updated += 1;
  }

  let listingVectors;
  try {
    listingVectors = await rebuildVectors({ database });
  } catch (error) {
    throw new Error("Jobs were saved, but rebuilding listing skill vectors failed.", {
      cause: error,
    });
  }
  return { fetched: data.jobs.length, inserted, updated, listingVectors };
}

export async function fetchAllConfiguredJobs(
  {
    fetchImpl = fetch,
    database = prisma,
    rebuildVectors = rebuildListingVectors,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  const totals = { fetched: 0, inserted: 0, updated: 0 };
  let requestCount = 0;
  let fetchError;

  try {
    for (const keywords of DEFAULT_JOB_KEYWORDS) {
      if (requestCount > 0) await wait(JOB_FETCH_DELAY_MS);
      const result = await fetchAndStoreJobs(
        { keywords, location: DEFAULT_JOB_LOCATION },
        {
          fetchImpl,
          database,
          rebuildVectors: async () => undefined,
          resultLimit: DEFAULT_JOB_RESULT_LIMIT,
        },
      );
      requestCount += 1;
      totals.fetched += result.fetched;
      totals.inserted += result.inserted;
      totals.updated += result.updated;
    }
  } catch (error) {
    fetchError = error;
  }

  let listingVectors;
  if (requestCount > 0) {
    try {
      listingVectors = await rebuildVectors({ database });
    } catch (error) {
      if (fetchError) {
        throw new AggregateError(
          [fetchError, error],
          "Job refresh failed and rebuilding listing skill vectors also failed.",
          { cause: error },
        );
      }
      throw new Error("Jobs were saved, but rebuilding listing skill vectors failed.", {
        cause: error,
      });
    }
  }

  if (fetchError) throw fetchError;
  return { ...totals, listingVectors };
}
