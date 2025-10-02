-- Persist pre-registration email verifications so step 1 survives server restarts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'pre_email_verifications'
    ) THEN
        CREATE TABLE pre_email_verifications (
            email               VARCHAR(255) PRIMARY KEY,
            verified            BOOLEAN NOT NULL DEFAULT FALSE,
            verified_at         TIMESTAMPTZ,
            last_token          VARCHAR(255),
            token_expires_at    TIMESTAMPTZ,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        RAISE NOTICE 'Created table pre_email_verifications';
    ELSE
        RAISE NOTICE 'Table pre_email_verifications already exists';
    END IF;
END $$;
