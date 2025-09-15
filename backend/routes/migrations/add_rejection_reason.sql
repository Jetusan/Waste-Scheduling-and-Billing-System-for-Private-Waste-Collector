-- Add rejection_reason column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE users ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Added rejection_reason column to users table';
    ELSE
        RAISE NOTICE 'rejection_reason column already exists in users table';
    END IF;
END $$;
