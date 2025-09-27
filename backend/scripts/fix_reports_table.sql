-- Fix reports table to add missing data column
ALTER TABLE reports ADD COLUMN IF NOT EXISTS data JSONB;

-- Update existing reports with empty data if null
UPDATE reports SET data = '{}' WHERE data IS NULL;
