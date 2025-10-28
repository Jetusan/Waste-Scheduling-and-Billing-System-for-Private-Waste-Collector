-- FIX LEDGER TRANSACTION ORDER
-- This script ensures invoices always appear before payments on the same date

-- 1. Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_ledger_entries;

-- 2. Create corrected materialized view with proper ordering
CREATE MATERIALIZED VIEW user_ledger_entries AS
WITH ledger_entries AS (
  -- Invoice entries (debits)
  SELECT 
    i.user_id,
    i.created_at as date,
    CASE 
      WHEN COALESCE(i.description, '') ILIKE '%special%' OR i.invoice_number LIKE 'SP-%' THEN 
        'Special Pickup - ' || COALESCE(i.description, 'Special Pickup Service')
      WHEN COALESCE(i.description, '') ILIKE '%late%' THEN 
        'Late Payment Fee'
      ELSE 
        'Monthly Subscription Fee'
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
    CASE 
      WHEN COALESCE(p.payment_method, '') ILIKE '%gcash%' THEN 'Payment Received - Manual GCash'
      WHEN COALESCE(p.payment_method, '') ILIKE '%cash%' THEN 'Payment Received - cash'
      WHEN COALESCE(p.reference_number, '') LIKE 'SP-%' THEN 'Payment Received - cash'
      ELSE 'Payment Received - ' || COALESCE(p.payment_method, 'Unknown Method')
    END as description,
    COALESCE(p.reference_number, 'AUTO-' || EXTRACT(EPOCH FROM p.payment_date)::bigint) as reference,
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
  -- Calculate running balance with proper ordering (invoices before payments)
  SUM(debit - credit) OVER (
    PARTITION BY user_id 
    ORDER BY sort_date, CASE WHEN entry_type = 'invoice' THEN 1 ELSE 2 END
    ROWS UNBOUNDED PRECEDING
  ) as balance
FROM ledger_entries
ORDER BY user_id, sort_date, CASE WHEN entry_type = 'invoice' THEN 1 ELSE 2 END;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ledger_entries_user_id ON user_ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ledger_entries_date ON user_ledger_entries(date);

-- 4. Refresh the view with current data
REFRESH MATERIALIZED VIEW user_ledger_entries;

-- 5. Update invoice descriptions for clarity
UPDATE invoices 
SET description = CASE 
  WHEN invoice_number LIKE 'SP-%' THEN 'Special Pickup Service'
  WHEN amount = 199 AND COALESCE(description, '') ILIKE '%late%' THEN 'Late Payment Fee'
  WHEN amount = 199 THEN 'Monthly Subscription Fee'
  WHEN amount > 199 THEN 'Special Pickup Service'
  ELSE COALESCE(description, 'Monthly Subscription Fee')
END
WHERE description IS NULL OR description = '';

-- 6. Ensure proper reference numbers for payments without them
UPDATE payments 
SET reference_number = CASE 
  WHEN reference_number IS NULL OR reference_number = '' THEN 
    'AUTO-' || EXTRACT(EPOCH FROM payment_date)::bigint
  ELSE reference_number
END
WHERE reference_number IS NULL OR reference_number = '';

COMMIT;
