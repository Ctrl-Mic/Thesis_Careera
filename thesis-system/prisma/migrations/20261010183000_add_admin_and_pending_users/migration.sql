DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'users'
          AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE "users"
            ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

ALTER TABLE "users"
    ALTER COLUMN "password_hash" DROP NOT NULL;
