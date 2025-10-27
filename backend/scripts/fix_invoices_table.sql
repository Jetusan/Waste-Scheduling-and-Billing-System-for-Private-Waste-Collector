-- Fix invoices table - Add missing columns for special pickup system
-- This script adds the missing service_start and service_end columns

-- Add missing columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS service_start DATE,
ADD COLUMN IF NOT EXISTS service_end DATE;

-- Update existing invoices to have service dates based on created_at
UPDATE invoices 
SET 
    service_start = DATE(created_at),
    service_end = DATE(created_at)
WHERE service_start IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_service_dates ON invoices(service_start, service_end);

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('service_start', 'service_end')
ORDER BY column_name;
