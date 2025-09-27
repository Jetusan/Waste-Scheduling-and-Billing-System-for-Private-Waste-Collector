-- Add missing columns to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing reports with current timestamp if created_at is null
UPDATE reports SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
