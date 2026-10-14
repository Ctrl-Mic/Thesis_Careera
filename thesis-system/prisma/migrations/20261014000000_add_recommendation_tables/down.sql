DROP TABLE IF EXISTS "recommendation";
DROP TABLE IF EXISTS "skill_idf";
DROP TABLE IF EXISTS "listing_skill";
DROP TABLE IF EXISTS "user_skill_profile";
DROP TABLE IF EXISTS "assessment_answer";
DROP TABLE IF EXISTS "assessment_attempt";
DROP TABLE IF EXISTS "job_listings";

ALTER TABLE "skills_dictionary"
    DROP CONSTRAINT IF EXISTS "skills_dictionary_pkey";
