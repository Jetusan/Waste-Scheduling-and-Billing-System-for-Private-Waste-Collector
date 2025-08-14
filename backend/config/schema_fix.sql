-- Fix for the database schema to add role_id reference to users table
-- This addresses the structural issue mentioned by your professor

-- Add role_id column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(role_id);

-- Add a constraint to ensure role_id is not null
ALTER TABLE users 
ALTER COLUMN role_id SET NOT NULL;

-- Update existing users to have role_id = 3 (resident) if they don't have one
UPDATE users 
SET role_id = 3 
WHERE role_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
