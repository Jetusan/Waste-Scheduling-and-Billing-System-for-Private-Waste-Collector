-- Add the missing service_start and service_end columns to invoices table
-- This is the simplest fix to resolve the column error

-- Add missing columns
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS service_start DATE,
ADD COLUMN IF NOT EXISTS service_end DATE;

-- Update existing records to have service dates
UPDATE invoices 
SET 
    service_start = COALESCE(service_start, DATE(created_at)),
    service_end = COALESCE(service_end, DATE(created_at))
WHERE service_start IS NULL OR service_end IS NULL;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('service_start', 'service_end')
ORDER BY column_name;
