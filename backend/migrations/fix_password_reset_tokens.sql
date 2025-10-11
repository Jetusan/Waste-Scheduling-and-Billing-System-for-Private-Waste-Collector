-- Fix password_reset_tokens table by adding missing email column
-- Run this in your Neon database console

-- Check if the table exists first
DO $$ 
BEGIN
    -- Check if password_reset_tokens table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_reset_tokens') THEN
        -- Create the complete table if it doesn't exist
        CREATE TABLE password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            ip_address INET,
            user_agent TEXT,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created password_reset_tokens table';
    ELSE
        -- Table exists, check and add missing columns
        
        -- Add email column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'email') THEN
            ALTER TABLE password_reset_tokens ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '';
            RAISE NOTICE 'Added email column';
        END IF;
        
        -- Add ip_address column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'ip_address') THEN
            ALTER TABLE password_reset_tokens ADD COLUMN ip_address INET;
            RAISE NOTICE 'Added ip_address column';
        END IF;
        
        -- Add user_agent column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'user_agent') THEN
            ALTER TABLE password_reset_tokens ADD COLUMN user_agent TEXT;
            RAISE NOTICE 'Added user_agent column';
        END IF;
        
        -- Add used column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'used') THEN
            ALTER TABLE password_reset_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added used column';
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'created_at') THEN
            ALTER TABLE password_reset_tokens ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added created_at column';
        END IF;
        
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'updated_at') THEN
            ALTER TABLE password_reset_tokens ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updated_at column';
        END IF;
        
    END IF;
END $$;

-- Show the final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'password_reset_tokens'
ORDER BY ordinal_position;
