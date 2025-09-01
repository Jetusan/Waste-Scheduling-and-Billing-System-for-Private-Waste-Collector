-- Fix invoices table schema by adding missing amount column
-- This is required for invoice generation to work properly

ALTER TABLE invoices 
ADD COLUMN amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Update the amount column to be non-nullable with proper constraint
ALTER TABLE invoices 
ALTER COLUMN amount SET NOT NULL;

-- Add a check constraint to ensure amount is positive
ALTER TABLE invoices 
ADD CONSTRAINT check_amount_positive CHECK (amount >= 0);

-- Verify the schema change
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;
