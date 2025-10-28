-- Add late fee columns to invoices table if they don't exist

-- Add late_fee_applied column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'late_fee_applied') THEN
        ALTER TABLE invoices ADD COLUMN late_fee_applied BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN invoices.late_fee_applied IS 'Whether late fee has been applied to this invoice';
    END IF;
END $$;

-- Add late_fee_amount column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'late_fee_amount') THEN
        ALTER TABLE invoices ADD COLUMN late_fee_amount DECIMAL(10,2) DEFAULT 0.00;
        COMMENT ON COLUMN invoices.late_fee_amount IS 'Amount of late fee applied to this invoice';
    END IF;
END $$;

-- Add invoice_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'invoice_type') THEN
        ALTER TABLE invoices ADD COLUMN invoice_type VARCHAR(50) DEFAULT 'subscription';
        COMMENT ON COLUMN invoices.invoice_type IS 'Type of invoice: subscription, special_pickup, etc.';
    END IF;
END $$;

-- Update existing invoices to have proper invoice_type
UPDATE invoices 
SET invoice_type = 'subscription' 
WHERE invoice_type IS NULL OR invoice_type = '';

-- Create index for late fee processing performance
CREATE INDEX IF NOT EXISTS idx_invoices_late_fee_processing 
ON invoices (status, due_date, late_fee_applied, invoice_type);

-- Create index for overdue invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_overdue 
ON invoices (due_date, status) 
WHERE status = 'unpaid';

COMMIT;
