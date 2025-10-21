-- Add GPS coordinates to special_pickup_requests table
-- This allows both residents and collectors to use map functionality

ALTER TABLE special_pickup_requests 
ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11, 8);

-- Add index for location-based queries (useful for finding nearby pickups)
CREATE INDEX IF NOT EXISTS idx_special_pickup_location 
ON special_pickup_requests(pickup_latitude, pickup_longitude);

-- Add comments for documentation
COMMENT ON COLUMN special_pickup_requests.pickup_latitude IS 'GPS latitude coordinate for pickup location';
COMMENT ON COLUMN special_pickup_requests.pickup_longitude IS 'GPS longitude coordinate for pickup location';
COMMENT ON COLUMN special_pickup_requests.address IS 'Text address (fallback when GPS not available)';
