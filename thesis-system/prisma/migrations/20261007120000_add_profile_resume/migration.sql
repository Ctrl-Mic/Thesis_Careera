ALTER TABLE "profile" RENAME COLUMN "resume_file" TO "resume_file_legacy";
ALTER TABLE "profile" ADD COLUMN "resume_file" BYTEA;
ALTER TABLE "profile" ADD COLUMN "resume_file_name" TEXT;
ALTER TABLE "profile" ADD COLUMN "resume_mime_type" TEXT;
ALTER TABLE "profile" ADD COLUMN "resume_uploaded_at" TIMESTAMP(3);