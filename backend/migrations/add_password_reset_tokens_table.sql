-- Password Reset Tokens Table for Neon Database
-- Run this SQL in your Neon database console or via migration

-- Create the password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_password_reset_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
    ON password_reset_tokens(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email 
    ON password_reset_tokens(email);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
    ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
    ON password_reset_tokens(expires_at);

-- Create function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust role name if needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE password_reset_tokens_id_seq TO your_app_user;

-- Insert a comment for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens sent via email for secure password recovery';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique reset token sent to user email';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used to reset password';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address of the request that created the token';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'User agent of the request that created the token';
