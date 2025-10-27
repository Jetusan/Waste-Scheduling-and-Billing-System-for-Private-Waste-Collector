-- ENHANCE LEDGER SCHEMA FOR BILLING SYSTEM
-- This script adds missing columns and creates a proper ledger view

-- 1. Add missing columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id);

-- 2. Update existing invoices to have user_id from subscriptions
UPDATE invoices 
SET user_id = cs.user_id 
FROM customer_subscriptions cs 
WHERE invoices.subscription_id = cs.subscription_id 
AND invoices.user_id IS NULL;

-- 3. Add index for better ledger performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id_via_invoice ON payments(invoice_id);

-- 4. Create a materialized view for ledger entries (optional for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_ledger_entries AS
WITH ledger_entries AS (
  -- Invoice entries (debits)
  SELECT 
    i.user_id,
    i.created_at as date,
    CASE 
      WHEN COALESCE(i.description, '') ILIKE '%special%' THEN 'Special Pickup - ' || COALESCE(i.description, 'Service')
      WHEN COALESCE(i.description, '') ILIKE '%late%' THEN 'Late Payment Fee'
      WHEN COALESCE(i.description, '') ILIKE '%subscription%' THEN 
        TO_CHAR(i.created_at, 'Month YYYY') || ' Subscription'
      ELSE COALESCE(i.description, 'Subscription Fee')
    END as description,
    COALESCE(i.invoice_number, CONCAT('INV-', i.invoice_id)) as reference,
    i.amount as debit,
    0 as credit,
    'invoice' as entry_type,
    i.created_at as sort_date
  FROM invoices i
  WHERE i.user_id IS NOT NULL
  
  UNION ALL
  
  -- Payment entries (credits)
  SELECT 
    i.user_id,
    p.payment_date as date,
    'Payment Received - ' || COALESCE(p.payment_method, 'Unknown Method') as description,
    COALESCE(p.reference_number, 'PAY-' || p.payment_id) as reference,
    0 as debit,
    p.amount as credit,
    'payment' as entry_type,
    p.payment_date as sort_date
  FROM payments p
  INNER JOIN invoices i ON p.invoice_id = i.invoice_id
  WHERE i.user_id IS NOT NULL
)
SELECT 
  user_id,
  date,
  description,
  reference,
  debit,
  credit,
  entry_type,
  sort_date,
  -- Calculate running balance
  SUM(debit - credit) OVER (
    PARTITION BY user_id 
    ORDER BY sort_date, entry_type DESC 
    ROWS UNBOUNDED PRECEDING
  ) as balance
FROM ledger_entries
ORDER BY user_id, sort_date, entry_type DESC;

-- 5. Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_user_ledger_entries_user_id ON user_ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ledger_entries_date ON user_ledger_entries(date);

-- 6. Function to refresh ledger view
CREATE OR REPLACE FUNCTION refresh_user_ledger()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW user_ledger_entries;
END;
$$ LANGUAGE plpgsql;

-- 7. Update invoice descriptions for existing records
UPDATE invoices 
SET description = CASE 
  WHEN amount > 1500 THEN 'Special Pickup Service'
  WHEN amount < 500 THEN 'Late Payment Fee'
  ELSE 'Monthly Subscription Fee'
END
WHERE description IS NULL;

-- 8. Create trigger to refresh ledger on invoice/payment changes
CREATE OR REPLACE FUNCTION trigger_refresh_ledger()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_user_ledger();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS refresh_ledger_on_invoice_change ON invoices;
DROP TRIGGER IF EXISTS refresh_ledger_on_payment_change ON payments;

-- Create triggers
CREATE TRIGGER refresh_ledger_on_invoice_change
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_ledger();

CREATE TRIGGER refresh_ledger_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_ledger();

-- 9. Initial refresh
SELECT refresh_user_ledger();
