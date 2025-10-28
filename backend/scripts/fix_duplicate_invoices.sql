-- Fix Duplicate Invoice Issues
-- This script identifies and removes duplicate invoices

-- 1. First, let's see what duplicates we have
SELECT 
    user_id,
    subscription_id,
    DATE(created_at) as invoice_date,
    COUNT(*) as duplicate_count,
    STRING_AGG(invoice_number, ', ') as invoice_numbers,
    STRING_AGG(invoice_id::text, ', ') as invoice_ids
FROM invoices 
WHERE status = 'unpaid'
GROUP BY user_id, subscription_id, DATE(created_at)
HAVING COUNT(*) > 1
ORDER BY user_id, invoice_date;

-- 2. Remove duplicate invoices (keep only the first one created)
WITH duplicate_invoices AS (
    SELECT 
        invoice_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, subscription_id, DATE(created_at) 
            ORDER BY created_at ASC
        ) as row_num
    FROM invoices 
    WHERE status = 'unpaid'
)
DELETE FROM invoices 
WHERE invoice_id IN (
    SELECT invoice_id 
    FROM duplicate_invoices 
    WHERE row_num > 1
);

-- 3. Prevent future duplicates by adding a unique constraint
-- (This will prevent the same subscription from having multiple unpaid invoices on the same date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_subscription_invoice 
ON invoices (user_id, subscription_id, DATE(created_at)) 
WHERE status = 'unpaid';

-- 4. Update any invoices that might have wrong descriptions
UPDATE invoices 
SET description = CASE 
    WHEN amount > 1500 THEN 'Special Pickup Service'
    WHEN amount < 500 THEN 'Late Payment Fee'
    ELSE 'Monthly Subscription Fee'
END
WHERE description IS NULL OR description = '';

-- 5. Check for orphaned invoices (invoices without valid subscriptions)
SELECT 
    i.invoice_id,
    i.invoice_number,
    i.user_id,
    i.subscription_id,
    i.amount,
    i.created_at,
    cs.status as subscription_status
FROM invoices i
LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
WHERE cs.subscription_id IS NULL
ORDER BY i.created_at DESC;

-- 6. Summary of current invoice status
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM invoices 
GROUP BY status
ORDER BY status;
