DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "skills_dictionary"
        WHERE "skill_id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot add skills_dictionary primary key: skill_id contains NULL values';
    END IF;

    IF EXISTS (
        SELECT "skill_id"
        FROM "skills_dictionary"
        GROUP BY "skill_id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot add skills_dictionary primary key: skill_id contains duplicates';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'skills_dictionary'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE "skills_dictionary"
            ADD CONSTRAINT "skills_dictionary_pkey" PRIMARY KEY ("skill_id");
    END IF;
END $$;

CREATE TABLE "job_listings" (
    "listing_id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "description" TEXT,
    "job_type" TEXT,
    "listing_type" TEXT NOT NULL DEFAULT 'job',
    "salary" TEXT,
    "external_url" TEXT,
    "posted_at" TIMESTAMP(3),
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("listing_id"),
    CONSTRAINT "job_listings_listing_type_check"
        CHECK ("listing_type" IN ('job', 'practicum')),
    CONSTRAINT "job_listings_source_external_id_key"
        UNIQUE ("source", "external_id")
);

CREATE INDEX "job_listings_listing_type_idx" ON "job_listings"("listing_type");
CREATE INDEX "job_listings_is_active_idx" ON "job_listings"("is_active");
CREATE INDEX "job_listings_location_idx" ON "job_listings"("location");

CREATE TABLE "assessment_attempt" (
    "attempt_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_attempt_pkey" PRIMARY KEY ("attempt_id"),
    CONSTRAINT "assessment_attempt_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "assessment_attempt_user_id_idx"
    ON "assessment_attempt"("user_id");

CREATE TABLE "assessment_answer" (
    "attempt_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "level" SMALLINT NOT NULL,
    CONSTRAINT "assessment_answer_pkey" PRIMARY KEY ("attempt_id", "category"),
    CONSTRAINT "assessment_answer_level_check" CHECK ("level" BETWEEN 0 AND 5),
    CONSTRAINT "assessment_answer_attempt_id_fkey"
        FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempt"("attempt_id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "user_skill_profile" (
    "user_id" UUID NOT NULL,
    "skill_id" VARCHAR(5) NOT NULL,
    "assessment_weight" REAL NOT NULL DEFAULT 0,
    "in_resume" BOOLEAN NOT NULL DEFAULT FALSE,
    "in_certificate" BOOLEAN NOT NULL DEFAULT FALSE,
    "final_weight" REAL NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_skill_profile_pkey" PRIMARY KEY ("user_id", "skill_id"),
    CONSTRAINT "user_skill_profile_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_skill_profile_skill_id_fkey"
        FOREIGN KEY ("skill_id") REFERENCES "skills_dictionary"("skill_id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "user_skill_profile_skill_id_idx"
    ON "user_skill_profile"("skill_id");

CREATE TABLE "listing_skill" (
    "listing_id" INTEGER NOT NULL,
    "skill_id" VARCHAR(5) NOT NULL,
    "term_count" INTEGER NOT NULL,
    "tfidf" REAL NOT NULL,
    CONSTRAINT "listing_skill_pkey" PRIMARY KEY ("listing_id", "skill_id"),
    CONSTRAINT "listing_skill_listing_id_fkey"
        FOREIGN KEY ("listing_id") REFERENCES "job_listings"("listing_id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "listing_skill_skill_id_fkey"
        FOREIGN KEY ("skill_id") REFERENCES "skills_dictionary"("skill_id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "listing_skill_skill_id_idx" ON "listing_skill"("skill_id");

CREATE TABLE "skill_idf" (
    "skill_id" VARCHAR(5) NOT NULL,
    "doc_freq" INTEGER NOT NULL,
    "idf" REAL NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "skill_idf_pkey" PRIMARY KEY ("skill_id"),
    CONSTRAINT "skill_idf_skill_id_fkey"
        FOREIGN KEY ("skill_id") REFERENCES "skills_dictionary"("skill_id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "recommendation" (
    "user_id" UUID NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "match_score" REAL NOT NULL,
    "readiness_pct" REAL NOT NULL,
    "gaps" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recommendation_pkey" PRIMARY KEY ("user_id", "listing_id"),
    CONSTRAINT "recommendation_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recommendation_listing_id_fkey"
        FOREIGN KEY ("listing_id") REFERENCES "job_listings"("listing_id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "recommendation_listing_id_idx"
    ON "recommendation"("listing_id");
