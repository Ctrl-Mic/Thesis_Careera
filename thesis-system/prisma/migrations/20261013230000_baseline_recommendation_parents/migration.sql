CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" TEXT,
    "is_admin" BOOLEAN,
    "is_verified" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "skills_dictionary" (
    "skill_id" VARCHAR(5),
    "canonical_skill" VARCHAR(100),
    "synonyms" TEXT,
    "assessment_category" VARCHAR(100)
);

ALTER TABLE "profile"
    ADD COLUMN IF NOT EXISTS "resume_text" JSONB;
