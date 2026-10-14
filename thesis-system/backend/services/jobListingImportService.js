import prisma from "../lib/prisma.js";
import { rebuildListingVectors } from "./listingVectorService.js";

const requiredFields = [
  "title",
  "company",
  "location",
  "description",
  "listing_type",
  "external_url",
];

function validateListing(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { error: "Row must contain a listing object." };
  }

  const listing = {};
  for (const field of requiredFields) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) {
      return { error: `${field} is required.` };
    }
    listing[field] = entry[field].trim();
  }

  listing.listing_type = listing.listing_type.toLowerCase();
  if (!["job", "practicum"].includes(listing.listing_type)) {
    return { error: "listing_type must be either job or practicum." };
  }

  try {
    const url = new URL(listing.external_url);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
      return { error: "external_url must be a valid HTTP or HTTPS URL." };
    }
  } catch {
    return { error: "external_url must be a valid HTTP or HTTPS URL." };
  }

  return { listing };
}

async function upsertListing(database, listing) {
  return database.$queryRaw`
    INSERT INTO "job_listings" (
      "source", "external_id", "title", "company", "location", "description",
      "listing_type", "external_url", "fetched_at", "is_active"
    )
    VALUES (
      'manual', ${listing.external_url}, ${listing.title}, ${listing.company},
      ${listing.location}, ${listing.description}, ${listing.listing_type},
      ${listing.external_url}, NOW(), TRUE
    )
    ON CONFLICT ("external_url")
      WHERE "source" = 'manual' AND "external_url" IS NOT NULL
    DO UPDATE SET
      "external_id" = EXCLUDED."external_id",
      "title" = EXCLUDED."title",
      "company" = EXCLUDED."company",
      "location" = EXCLUDED."location",
      "description" = EXCLUDED."description",
      "listing_type" = EXCLUDED."listing_type",
      "external_url" = EXCLUDED."external_url",
      "fetched_at" = NOW(),
      "is_active" = TRUE
    RETURNING ("xmax" = 0) AS inserted
  `;
}

export async function importJobListings(
  rows,
  { database = prisma, rebuildVectors = rebuildListingVectors } = {},
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Provide at least one job listing to import.");
  }

  let inserted = 0;
  let updated = 0;
  const rejected = [];

  for (const [index, entry] of rows.entries()) {
    const validation = validateListing(entry);
    if (validation.error) {
      rejected.push({
        row: Number.isInteger(entry?._rowNumber) ? entry._rowNumber : index + 2,
        reason: validation.error,
      });
      continue;
    }

    const result = await upsertListing(database, validation.listing);
    if (result[0]?.inserted) inserted += 1;
    else updated += 1;
  }

  let listingVectors;
  try {
    listingVectors = await rebuildVectors({ database });
  } catch (error) {
    throw new Error("Listings were processed, but rebuilding listing skill vectors failed.", {
      cause: error,
    });
  }

  return { inserted, updated, rejected, listingVectors };
}
