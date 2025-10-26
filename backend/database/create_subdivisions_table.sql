-- Create subdivisions table for San Isidro VSM Heights Phase 1
-- This script works with your current database structure

-- 1. Create the subdivisions table (since it doesn't exist)
CREATE TABLE IF NOT EXISTS subdivisions (
    subdivision_id SERIAL PRIMARY KEY,
    subdivision_name VARCHAR(200) NOT NULL,
    barangay_id INTEGER REFERENCES barangays(barangay_id),
    description TEXT,
    website VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insert VSM Heights Phase 1 subdivision for San Isidro
INSERT INTO subdivisions (subdivision_name, barangay_id, description, status)
SELECT 'VSM Heights Phase 1', 6, 'VSM Heights Phase 1 subdivision in San Isidro', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM subdivisions 
  WHERE subdivision_name = 'VSM Heights Phase 1' 
  AND barangay_id = 6
);

-- 3. Add subdivision_id column to addresses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'subdivision_id'
  ) THEN
    ALTER TABLE addresses ADD COLUMN subdivision_id INTEGER REFERENCES subdivisions(subdivision_id);
  END IF;
END $$;

-- 4. Update existing addresses in San Isidro to use VSM Heights Phase 1 if they have 'VSM' in subdivision
UPDATE addresses 
SET subdivision_id = (
  SELECT subdivision_id 
  FROM subdivisions 
  WHERE subdivision_name = 'VSM Heights Phase 1' 
  AND barangay_id = 6
)
WHERE barangay_id = 6 
  AND (
    LOWER(subdivision) LIKE '%vsm%' 
    OR subdivision = 'VSM Heights Phase 1'
    OR subdivision IS NULL
  );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subdivisions_barangay_id ON subdivisions(barangay_id);
CREATE INDEX IF NOT EXISTS idx_subdivisions_name ON subdivisions(subdivision_name);
CREATE INDEX IF NOT EXISTS idx_addresses_subdivision_id ON addresses(subdivision_id);

-- 6. Verify the setup
SELECT 
  s.subdivision_id,
  s.subdivision_name,
  s.barangay_id,
  b.barangay_name,
  s.description,
  s.status,
  COUNT(a.address_id) as address_count
FROM subdivisions s
LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
LEFT JOIN addresses a ON s.subdivision_id = a.subdivision_id
WHERE b.barangay_name = 'San Isidro'
GROUP BY s.subdivision_id, s.subdivision_name, s.barangay_id, b.barangay_name, s.description, s.status
ORDER BY s.subdivision_name;
