-- Comprehensive database schema fix for WSBS
-- This script fixes multiple missing tables and columns

-- 1. Add missing columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS service_start DATE,
ADD COLUMN IF NOT EXISTS service_end DATE;

-- Update existing invoices with service dates
UPDATE invoices 
SET 
    service_start = COALESCE(service_start, DATE(created_at)),
    service_end = COALESCE(service_end, DATE(created_at))
WHERE service_start IS NULL OR service_end IS NULL;

-- 2. Create customer_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    barangay_id INTEGER REFERENCES barangays(barangay_id),
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id ON customer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_primary ON customer_addresses(user_id, is_primary);

-- 4. Migrate existing user addresses to customer_addresses table
INSERT INTO customer_addresses (user_id, address_line_1, barangay_id, is_primary, created_at, updated_at)
SELECT 
    user_id,
    COALESCE(address, 'No address provided') as address_line_1,
    barangay_id,
    TRUE as is_primary,
    created_at,
    updated_at
FROM users 
WHERE address IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM customer_addresses ca WHERE ca.user_id = users.user_id
);

-- 5. Update create_special_pickup_invoice function to handle missing columns gracefully
CREATE OR REPLACE FUNCTION create_special_pickup_invoice(pickup_request_id INTEGER)
RETURNS JSON AS $$
DECLARE
    pickup_record RECORD;
    new_invoice_id INTEGER;
    invoice_number_val VARCHAR(50);
    result JSON;
BEGIN
    -- Get the special pickup request details
    SELECT * INTO pickup_record 
    FROM special_pickup_requests 
    WHERE request_id = pickup_request_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Special pickup request not found');
    END IF;
    
    -- Check if final_price is set
    IF pickup_record.final_price IS NULL OR pickup_record.final_price <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Final price not set for this pickup request');
    END IF;
    
    -- Check if invoice already exists
    IF EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoice_type = 'special'
        AND user_id = pickup_record.user_id
        AND amount = pickup_record.final_price
        AND DATE(created_at) = DATE(pickup_record.updated_at)
    ) THEN
        RAISE NOTICE 'Invoice already exists for special pickup request_id: %', pickup_request_id;
        RETURN json_build_object('success', false, 'error', 'Invoice already exists for this pickup');
    END IF;
    
    -- Generate invoice number
    invoice_number_val := 'SP-' || pickup_request_id || '-' || EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Create the invoice and mark as PAID (since collector already collected cash)
    INSERT INTO invoices (
        invoice_number,
        user_id,
        amount,
        due_date,
        status,
        generated_date,
        service_start,
        service_end,
        invoice_type,
        description,
        notes,
        created_at,
        updated_at
    ) VALUES (
        invoice_number_val,
        pickup_record.user_id,
        pickup_record.final_price,
        pickup_record.pickup_date,
        'paid',
        CURRENT_DATE,
        pickup_record.pickup_date,
        pickup_record.pickup_date,
        'special',
        'Special Pickup - ' || pickup_record.waste_type || ' (' || pickup_record.bag_quantity || ' bags)',
        'Generated from special pickup request #' || pickup_request_id || ' - Payment collected by collector',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING invoice_id INTO new_invoice_id;
    
    -- Create corresponding payment record
    INSERT INTO payments (
        invoice_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        created_at,
        updated_at
    ) VALUES (
        new_invoice_id,
        pickup_record.final_price,
        'cash',
        pickup_record.payment_date,
        'SP-PAY-' || pickup_request_id,
        'Payment for special pickup request #' || pickup_request_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    -- Return success with invoice details
    result := json_build_object(
        'success', true,
        'invoice_id', new_invoice_id,
        'invoice_number', invoice_number_val,
        'amount', pickup_record.final_price,
        'status', 'paid'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Failed to create invoice: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 6. Verify the schema fixes
SELECT 'Schema verification:' as status;

-- Check invoices table columns
SELECT 'invoices table columns:' as check_type, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('service_start', 'service_end')
ORDER BY column_name;

-- Check customer_addresses table
SELECT 'customer_addresses table exists:' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_addresses') 
            THEN 'YES' ELSE 'NO' END as exists;

-- Show function exists
SELECT 'create_special_pickup_invoice function exists:' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_special_pickup_invoice')
            THEN 'YES' ELSE 'NO' END as exists;
