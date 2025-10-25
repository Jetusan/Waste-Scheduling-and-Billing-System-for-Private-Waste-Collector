-- Add gate_image_url column to user_locations table
-- This will store the URL/path to the uploaded gate image

ALTER TABLE user_locations 
ADD COLUMN gate_image_url VARCHAR(500) NULL;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN user_locations.gate_image_url IS 'URL/path to the uploaded image of the user''s gate for location verification';

-- Create index for better performance when querying by user_id and kind
CREATE INDEX IF NOT EXISTS idx_user_locations_user_kind ON user_locations(user_id, kind) WHERE is_current = true;

-- Display the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_locations' 
ORDER BY ordinal_position;
