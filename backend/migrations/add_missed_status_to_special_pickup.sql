-- Add 'missed' status to special_pickup_requests table
-- This allows collectors to mark special pickups as missed, same as regular pickups

-- First, drop the existing CHECK constraint
ALTER TABLE special_pickup_requests 
DROP CONSTRAINT IF EXISTS special_pickup_requests_status_check;

-- Add the new CHECK constraint that includes 'missed' status
ALTER TABLE special_pickup_requests 
ADD CONSTRAINT special_pickup_requests_status_check 
CHECK (status IN ('pending', 'in_progress', 'collected', 'cancelled', 'missed'));

-- Add comment for documentation
COMMENT ON COLUMN special_pickup_requests.status IS 'Status of the pickup request: pending, in_progress, collected, cancelled, missed';

-- Optional: Update any existing records if needed (uncomment if required)
-- UPDATE special_pickup_requests SET status = 'missed' WHERE status = 'some_old_status';
