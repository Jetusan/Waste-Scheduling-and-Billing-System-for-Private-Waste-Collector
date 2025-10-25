-- Migration: Add subdivision column to collection_schedules table
-- This migration adds subdivision support to the existing collection schedules table

-- Current table status (from checkCollectionSchedules.js):
-- ✅ collection_schedules table EXISTS with: schedule_id, schedule_date, created_at, waste_type, time_range
-- ❌ subdivision column is MISSING
-- ❌ updated_at column is MISSING  
-- ❌ update_collection_schedules_updated_at trigger is missing
-- ❌ Additional indexes are missing

-- Add missing columns to existing table
ALTER TABLE collection_schedules 
ADD COLUMN IF NOT EXISTS subdivision VARCHAR(100),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create schedule_barangays junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedule_barangays (
    schedule_id INTEGER REFERENCES collection_schedules(schedule_id) ON DELETE CASCADE,
    barangay_id INTEGER REFERENCES barangays(barangay_id) ON DELETE CASCADE,
    PRIMARY KEY (schedule_id, barangay_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collection_schedules_schedule_date ON collection_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_waste_type ON collection_schedules(waste_type);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_subdivision ON collection_schedules(subdivision);
CREATE INDEX IF NOT EXISTS idx_schedule_barangays_schedule_id ON schedule_barangays(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_barangays_barangay_id ON schedule_barangays(barangay_id);

-- Create trigger to update updated_at timestamp (drop first if exists)
DROP TRIGGER IF EXISTS update_collection_schedules_updated_at ON collection_schedules;
CREATE TRIGGER update_collection_schedules_updated_at 
    BEFORE UPDATE ON collection_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (San Isidro only) - only if table is nearly empty
INSERT INTO collection_schedules (schedule_date, waste_type, time_range, subdivision)
SELECT * FROM (VALUES
    ('Monday', 'Non-bio', '8am to 12pm', 'Subdivision A'),
    ('Tuesday', 'Bio', '8am to 12pm', 'Subdivision B'),
    ('Wednesday', 'Recyclable', '8am to 12pm', 'Subdivision C'),
    ('Thursday', 'Non-bio', '1pm to 5pm', 'Subdivision A'),
    ('Friday', 'Bio', '1pm to 5pm', 'Subdivision B'),
    ('Saturday', 'Recyclable', '1pm to 5pm', 'Subdivision C')
) AS seed(schedule_date, waste_type, time_range, subdivision)
WHERE (SELECT COUNT(*) FROM collection_schedules) <= 1; -- Only add if 1 or fewer rows exist

-- Link schedules to San Isidro barangay - avoid duplicates
INSERT INTO schedule_barangays (schedule_id, barangay_id)
SELECT cs.schedule_id, b.barangay_id
FROM collection_schedules cs
CROSS JOIN barangays b
WHERE b.barangay_name = 'San Isidro'
  AND NOT EXISTS (
    SELECT 1 FROM schedule_barangays sb 
    WHERE sb.schedule_id = cs.schedule_id AND sb.barangay_id = b.barangay_id
  );
