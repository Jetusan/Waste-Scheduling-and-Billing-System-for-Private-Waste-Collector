-- Add columns to support balance-aware invoicing
-- This allows tracking original amounts and credits applied

-- Add columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS credit_applied DECIMAL(10,2) DEFAULT 0;

-- Update existing invoices to have original_amount = amount where null
UPDATE invoices 
SET original_amount = amount 
WHERE original_amount IS NULL;

-- Add index for better performance on balance queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_created 
ON invoices(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_date 
ON payments(invoice_id, payment_date);

-- Add comments for documentation
COMMENT ON COLUMN invoices.original_amount IS 'Original invoice amount before any balance/credit adjustments';
COMMENT ON COLUMN invoices.credit_applied IS 'Amount of user credit applied to reduce this invoice';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name IN ('original_amount', 'credit_applied')
ORDER BY column_name;
