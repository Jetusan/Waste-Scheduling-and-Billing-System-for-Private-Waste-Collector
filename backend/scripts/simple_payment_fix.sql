-- Simple fix for payment confirmation - just ensure columns exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS service_start DATE,
ADD COLUMN IF NOT EXISTS service_end DATE;

-- Update any NULL values
UPDATE invoices 
SET service_start = DATE(created_at) 
WHERE service_start IS NULL;

UPDATE invoices 
SET service_end = DATE(created_at) 
WHERE service_end IS NULL;
