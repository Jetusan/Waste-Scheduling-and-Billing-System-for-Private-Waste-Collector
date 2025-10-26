-- Enhanced Subdivision Support for San Isidro VSM Heights Phase 1
-- This script adds necessary enhancements to support subdivision-specific collections

-- 1. Ensure VSM Heights Phase 1 subdivision exists
INSERT INTO subdivisions (subdivision_name, barangay_id, description, status)
SELECT 'VSM Heights Phase 1', b.barangay_id, 'VSM Heights Phase 1 subdivision in San Isidro', 'active'
FROM barangays b 
WHERE b.barangay_name = 'San Isidro'
AND NOT EXISTS (
  SELECT 1 FROM subdivisions s 
  WHERE s.subdivision_name = 'VSM Heights Phase 1' 
  AND s.barangay_id = b.barangay_id
);

-- 2. Add subdivision filtering support to addresses table
-- Check if addresses table has subdivision column with proper constraints
DO $$
BEGIN
  -- Add subdivision column to addresses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'subdivision'
  ) THEN
    ALTER TABLE addresses ADD COLUMN subdivision VARCHAR(255);
  END IF;
  
  -- Add full_address column if it doesn't exist (for better address display)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'full_address'
  ) THEN
    ALTER TABLE addresses ADD COLUMN full_address TEXT;
  END IF;
  
  -- Add block and lot columns for VSM Heights addressing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'block'
  ) THEN
    ALTER TABLE addresses ADD COLUMN block VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'lot'
  ) THEN
    ALTER TABLE addresses ADD COLUMN lot VARCHAR(50);
  END IF;
END $$;

-- 3. Enhance collector_barangay_assignments table for subdivision-specific assignments
DO $$
BEGIN
  -- Ensure subdivision column exists with proper length
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collector_barangay_assignments' 
    AND column_name = 'subdivision'
  ) THEN
    ALTER TABLE collector_barangay_assignments ADD COLUMN subdivision VARCHAR(255);
  END IF;
  
  -- Add priority column for assignment prioritization
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collector_barangay_assignments' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE collector_barangay_assignments ADD COLUMN priority INTEGER DEFAULT 1;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collector_barangay_assignments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE collector_barangay_assignments ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_subdivision ON addresses(subdivision);
CREATE INDEX IF NOT EXISTS idx_addresses_barangay_subdivision ON addresses(barangay_id, subdivision);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_subdivision ON collector_barangay_assignments(subdivision);
CREATE INDEX IF NOT EXISTS idx_collector_assignments_barangay_subdivision ON collector_barangay_assignments(barangay_id, subdivision);

-- 5. Create view for easy subdivision-based resident lookup
CREATE OR REPLACE VIEW residents_by_subdivision AS
SELECT 
  u.user_id,
  CONCAT(un.first_name, ' ', un.last_name) AS resident_name,
  u.contact_number,
  a.full_address,
  a.street,
  a.subdivision,
  a.block,
  a.lot,
  b.barangay_name,
  b.barangay_id,
  s.subdivision_name,
  s.subdivision_id,
  cs.status as subscription_status,
  cs.subscription_id,
  sp.plan_name,
  sp.price
FROM users u
LEFT JOIN user_names un ON u.name_id = un.name_id
LEFT JOIN addresses a ON u.address_id = a.address_id
LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
LEFT JOIN subdivisions s ON a.subdivision_id = s.subdivision_id
LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
WHERE u.role_id = 3 
  AND u.approval_status = 'approved'
  AND cs.created_at = (
    SELECT MAX(cs2.created_at) 
    FROM customer_subscriptions cs2 
    WHERE cs2.user_id = u.user_id
  );

-- 6. Sample data for testing VSM Heights Phase 1 focus
-- Update existing San Isidro residents to VSM Heights Phase 1 if needed
UPDATE addresses 
SET subdivision = 'VSM Heights Phase 1',
    subdivision_id = (
      SELECT subdivision_id 
      FROM subdivisions s 
      JOIN barangays b ON s.barangay_id = b.barangay_id 
      WHERE b.barangay_name = 'San Isidro' 
      AND s.subdivision_name = 'VSM Heights Phase 1'
    )
WHERE barangay_id = (
  SELECT barangay_id FROM barangays WHERE barangay_name = 'San Isidro'
)
AND (subdivision IS NULL OR subdivision = '');

-- 7. Create function to get subdivision-specific collection stops
CREATE OR REPLACE FUNCTION get_subdivision_collection_stops(
  p_collector_id INTEGER,
  p_barangay_id INTEGER,
  p_subdivision VARCHAR DEFAULT NULL,
  p_collection_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id INTEGER,
  resident_name TEXT,
  address TEXT,
  subdivision VARCHAR,
  block VARCHAR,
  lot VARCHAR,
  subscription_status VARCHAR,
  subscription_id INTEGER,
  plan_name VARCHAR,
  price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rv.user_id,
    rv.resident_name,
    rv.full_address as address,
    rv.subdivision,
    rv.block,
    rv.lot,
    rv.subscription_status,
    rv.subscription_id,
    rv.plan_name,
    rv.price
  FROM residents_by_subdivision rv
  WHERE rv.barangay_id = p_barangay_id
    AND rv.subscription_status IN ('active', 'pending_payment')
    AND (p_subdivision IS NULL OR rv.subdivision = p_subdivision)
  ORDER BY rv.subdivision, rv.block, rv.lot, rv.resident_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subdivision_collection_stops IS 'Get collection stops filtered by subdivision for focused collection routes';
