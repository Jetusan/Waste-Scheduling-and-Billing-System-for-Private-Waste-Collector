-- Add 'missed' status to special_pickup_requests table
-- This allows collectors to mark special pickups as missed, same as regular pickups

-- Step 1: Check existing constraints (run this first to see what exists)
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%special_pickup%status%';

-- Step 2: Drop ALL possible constraint names (PostgreSQL generates different names)
DO $$ 
BEGIN
    -- Try common constraint name patterns
    EXECUTE 'ALTER TABLE special_pickup_requests DROP CONSTRAINT IF EXISTS special_pickup_requests_status_check';
    EXECUTE 'ALTER TABLE special_pickup_requests DROP CONSTRAINT IF EXISTS special_pickup_requests_check';
    EXECUTE 'ALTER TABLE special_pickup_requests DROP CONSTRAINT IF EXISTS special_pickup_requests_status_check1';
    
    -- Get and drop any existing status check constraint
    FOR rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'special_pickup_requests' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE special_pickup_requests DROP CONSTRAINT IF EXISTS ' || rec.constraint_name;
    END LOOP;
END $$;

-- Step 3: Add the new CHECK constraint that includes 'missed' status
ALTER TABLE special_pickup_requests 
ADD CONSTRAINT special_pickup_requests_status_check 
CHECK (status IN ('pending', 'in_progress', 'collected', 'cancelled', 'missed'));

-- Step 4: Add comment for documentation
COMMENT ON COLUMN special_pickup_requests.status IS 'Status of the pickup request: pending, in_progress, collected, cancelled, missed';

-- Step 5: Verify the constraint was added
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'special_pickup_requests_status_check';
