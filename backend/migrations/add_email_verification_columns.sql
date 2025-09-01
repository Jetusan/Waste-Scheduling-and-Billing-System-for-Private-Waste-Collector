-- Add email verification columns to users table
DO $$
BEGIN
    -- Add email_verified column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_verified column to users table';
    ELSE
        RAISE NOTICE 'email_verified column already exists in users table';
    END IF;

    -- Add verification_token column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verification_token'
    ) THEN
        ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
        RAISE NOTICE 'Added verification_token column to users table';
    ELSE
        RAISE NOTICE 'verification_token column already exists in users table';
    END IF;

    -- Add verification_token_expires column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verification_token_expires'
    ) THEN
        ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMPTZ;
        RAISE NOTICE 'Added verification_token_expires column to users table';
    ELSE
        RAISE NOTICE 'verification_token_expires column already exists in users table';
    END IF;

    -- Add rejection_reason column
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

    -- Ensure registration_status column exists with proper default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'registration_status'
    ) THEN
        ALTER TABLE users ADD COLUMN registration_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added registration_status column to users table';
    ELSE
        RAISE NOTICE 'registration_status column already exists in users table';
    END IF;

END $$;
