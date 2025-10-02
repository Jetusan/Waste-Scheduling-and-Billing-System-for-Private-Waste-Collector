-- Fix stop_id and schedule_id columns to accept both numbers and strings
-- Change from bigint to VARCHAR to support string IDs like "wednesday-organic-0"

-- Change stop_id from bigint to VARCHAR
ALTER TABLE collection_stop_events 
  ALTER COLUMN stop_id TYPE VARCHAR(100);

-- Change schedule_id from bigint to VARCHAR  
ALTER TABLE collection_stop_events 
  ALTER COLUMN schedule_id TYPE VARCHAR(100);

-- Also fix assignment_stop_status table
ALTER TABLE assignment_stop_status 
  ALTER COLUMN schedule_id TYPE VARCHAR(100);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'collection_stop_events' 
  AND column_name IN ('stop_id', 'schedule_id');

SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'assignment_stop_status' 
  AND column_name = 'schedule_id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Column types updated successfully!';
  RAISE NOTICE '📝 stop_id: bigint → VARCHAR(100)';
  RAISE NOTICE '📝 schedule_id: bigint → VARCHAR(100)';
  RAISE NOTICE '🎯 Can now store both numeric and string IDs!';
END $$;
