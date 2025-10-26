-- Clean up test subscription data for re-testing
-- Run these commands in your database to reset subscription flow testing

-- IMPORTANT: Replace 'YOUR_USER_ID' with your actual test user ID
-- You can find your user ID by running: SELECT user_id, username FROM users WHERE username = 'your_username';

-- Step 1: Delete receipts for test user
DELETE FROM receipts 
WHERE user_id = YOUR_USER_ID;

-- Step 2: Delete payments for test user subscriptions
DELETE FROM payments 
WHERE invoice_id IN (
  SELECT invoice_id FROM invoices 
  WHERE subscription_id IN (
    SELECT subscription_id FROM customer_subscriptions 
    WHERE user_id = YOUR_USER_ID
  )
);

-- Step 3: Delete GCash payment records for test user
DELETE FROM gcash_qr_payments 
WHERE user_id = YOUR_USER_ID;

-- Step 4: Reset invoice status to unpaid
UPDATE invoices 
SET status = 'unpaid', updated_at = NOW()
WHERE subscription_id IN (
  SELECT subscription_id FROM customer_subscriptions 
  WHERE user_id = YOUR_USER_ID
);

-- Step 5: Reset subscription status to pending
UPDATE customer_subscriptions 
SET 
  status = 'pending_payment',
  payment_status = 'pending',
  payment_method = 'manual_gcash',  -- or 'cash' if you want to test cash flow
  payment_confirmed_at = NULL,
  updated_at = NOW()
WHERE user_id = YOUR_USER_ID;

-- Verification queries (run these to check cleanup worked):
SELECT 'Receipts' as table_name, COUNT(*) as count FROM receipts WHERE user_id = YOUR_USER_ID
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE subscription_id IN (SELECT subscription_id FROM customer_subscriptions WHERE user_id = YOUR_USER_ID))
UNION ALL
SELECT 'GCash Payments', COUNT(*) FROM gcash_qr_payments WHERE user_id = YOUR_USER_ID
UNION ALL
SELECT 'Active Subscriptions', COUNT(*) FROM customer_subscriptions WHERE user_id = YOUR_USER_ID AND status = 'active'
UNION ALL
SELECT 'Pending Subscriptions', COUNT(*) FROM customer_subscriptions WHERE user_id = YOUR_USER_ID AND status = 'pending_payment';

-- Show current subscription status
SELECT 
  cs.subscription_id,
  cs.status as subscription_status,
  cs.payment_status,
  cs.payment_method,
  cs.payment_confirmed_at,
  i.status as invoice_status,
  i.amount
FROM customer_subscriptions cs
LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id
WHERE cs.user_id = YOUR_USER_ID
ORDER BY cs.created_at DESC;
