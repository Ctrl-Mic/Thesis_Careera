CREATE TABLE IF NOT EXISTS "profile" (
    "profile_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "academic_program" VARCHAR(100),
    "skills" TEXT,
    "certifications" TEXT,
    "experience" TEXT,
    "career_preference" VARCHAR(100),
    "resume_file" VARCHAR(255),
    "portfolio_file" VARCHAR(255),
    "certificates_file" VARCHAR(255),
    CONSTRAINT "profile_pkey" PRIMARY KEY ("profile_id")
);
