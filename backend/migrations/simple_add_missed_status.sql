-- Simple approach: Add 'missed' status to special_pickup_requests
-- This will work even if we don't know the exact constraint name

-- Step 1: First, let's see what constraints exist
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name IN (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'special_pickup_requests' 
    AND constraint_type = 'CHECK'
);

-- Step 2: Try to add a record with 'missed' status to test current constraint
-- (This will fail if 'missed' is not allowed, which tells us we need to update)
-- INSERT INTO special_pickup_requests (user_id, waste_type, pickup_date, pickup_time, address, status) 
-- VALUES (1, 'test', CURRENT_DATE, '10:00:00', 'test address', 'missed');
-- (Don't actually run this - it's just for testing)

-- Step 3: Drop constraint by finding it dynamically and add new one
DO $$ 
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find and drop any existing status check constraint
    FOR constraint_rec IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'special_pickup_requests' 
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE special_pickup_requests DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
    
    -- Add the new constraint
    ALTER TABLE special_pickup_requests 
    ADD CONSTRAINT special_pickup_requests_status_check 
    CHECK (status IN ('pending', 'in_progress', 'collected', 'cancelled', 'missed'));
    
    RAISE NOTICE 'Added new constraint with missed status';
END $$;

-- Step 4: Verify it worked by checking the constraint
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'special_pickup_requests_status_check';

-- Step 5: Test that 'missed' status is now allowed (optional)
-- You can uncomment this to test:
-- UPDATE special_pickup_requests SET status = 'missed' WHERE request_id = (SELECT MIN(request_id) FROM special_pickup_requests LIMIT 1);
-- UPDATE special_pickup_requests SET status = 'in_progress' WHERE status = 'missed'; -- Reset it back
