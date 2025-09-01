-- Optional: Clean up unused columns from invoices table
-- Run this only if you want to simplify the table structure

-- Remove unused columns that are always NULL or have default values
ALTER TABLE invoices DROP COLUMN IF EXISTS service_start;
ALTER TABLE invoices DROP COLUMN IF EXISTS service_end;
ALTER TABLE invoices DROP COLUMN IF EXISTS metadata;
ALTER TABLE invoices DROP COLUMN IF EXISTS is_voided;
ALTER TABLE invoices DROP COLUMN IF EXISTS invoice_type;

-- Keep late_fees for future use, but you could remove it too:
-- ALTER TABLE invoices DROP COLUMN IF EXISTS late_fees;
