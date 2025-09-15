-- Migration: Add plan_id foreign key to invoices table
-- This ensures proper relationship between invoices and subscription plans

BEGIN;

-- 1. Add plan_id column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS plan_id INTEGER;

-- 2. Add foreign key constraint
ALTER TABLE invoices 
ADD CONSTRAINT fk_invoices_plan_id 
FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Update existing invoices to reference the Full Plan (plan_id = 3)
-- This ensures existing data has proper plan references
UPDATE invoices 
SET plan_id = 3 
WHERE plan_id IS NULL;

-- 4. Make plan_id NOT NULL after updating existing data
ALTER TABLE invoices 
ALTER COLUMN plan_id SET NOT NULL;

-- 5. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'plan_id';

-- 6. Check foreign key constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'invoices'
    AND kcu.column_name = 'plan_id';

COMMIT;
