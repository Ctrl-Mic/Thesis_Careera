CREATE UNIQUE INDEX "job_listings_manual_external_url_key"
    ON "job_listings" ("external_url")
    WHERE "source" = 'manual' AND "external_url" IS NOT NULL;
