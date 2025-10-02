-- Fix GPS coordinate field sizes in payment_attempts table
-- The current DECIMAL(10,8) is too small for latitude/longitude values
-- Latitude ranges from -90 to 90
-- Longitude ranges from -180 to 180
-- We need DECIMAL(11,8) to accommodate these ranges

-- Fix location_lat column (latitude: -90 to 90)
ALTER TABLE payment_attempts 
  ALTER COLUMN location_lat TYPE DECIMAL(11,8);

-- Fix location_lng column (longitude: -180 to 180)  
ALTER TABLE payment_attempts 
  ALTER COLUMN location_lng TYPE DECIMAL(11,8);

-- Verify the changes
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'payment_attempts' 
  AND column_name IN ('location_lat', 'location_lng');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ GPS coordinate fields updated successfully!';
  RAISE NOTICE '📍 location_lat: DECIMAL(11,8) - supports -90 to 90';
  RAISE NOTICE '📍 location_lng: DECIMAL(11,8) - supports -180 to 180';
END $$;
