DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'users'
          AND column_name = 'student_id'
    ) THEN
        ALTER TABLE "users"
            ALTER COLUMN "student_id" TYPE TEXT
            USING "student_id"::TEXT;
    ELSE
        ALTER TABLE "users"
            ADD COLUMN "student_id" TEXT;
    END IF;
END $$;
