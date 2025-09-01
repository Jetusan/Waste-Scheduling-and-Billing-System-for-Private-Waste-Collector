-- Add missing amount column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Update the amount column with plan prices for any existing invoices
UPDATE invoices 
SET amount = sp.price 
FROM subscription_plans sp 
WHERE invoices.plan_id = sp.plan_id AND invoices.amount = 0.00;
