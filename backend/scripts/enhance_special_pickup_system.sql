-- ENHANCE SPECIAL PICKUP SYSTEM WITH BAG-BASED PRICING
-- This script adds bag quantity tracking, ₱25 per bag pricing, and payment collection
-- Standard: 25kg rice sack size bags at ₱25 each

-- 1. Add bag quantity and pricing columns to special_pickup_requests
ALTER TABLE special_pickup_requests 
ADD COLUMN IF NOT EXISTS bag_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS price_per_bag DECIMAL(10,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS estimated_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_collected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS collector_notes TEXT;

-- 2. Create special_pickup_payments table for cash tracking
CREATE TABLE IF NOT EXISTS special_pickup_payments (
    payment_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES special_pickup_requests(request_id) ON DELETE CASCADE,
    collector_id INTEGER NOT NULL REFERENCES collectors(collector_id),
    amount_collected DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create collector_cash_on_hand table for tracking collector money
CREATE TABLE IF NOT EXISTS collector_cash_on_hand (
    cash_id SERIAL PRIMARY KEY,
    collector_id INTEGER NOT NULL REFERENCES collectors(collector_id),
    transaction_type VARCHAR(20) NOT NULL, -- 'collection', 'deposit', 'adjustment'
    amount DECIMAL(10,2) NOT NULL,
    reference_id INTEGER, -- Links to special_pickup_payments or other tables
    reference_type VARCHAR(20), -- 'special_pickup', 'regular_collection', etc.
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Function to record special pickup payment collection (bag-based)
CREATE OR REPLACE FUNCTION collect_special_pickup_payment(
    p_request_id INTEGER,
    p_collector_id INTEGER,
    p_bags_collected INTEGER,
    p_amount_collected DECIMAL(10,2),
    p_payment_method VARCHAR(20) DEFAULT 'cash',
    p_collector_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_balance DECIMAL(10,2) := 0;
    new_balance DECIMAL(10,2);
    payment_record RECORD;
    receipt_number VARCHAR(50);
BEGIN
    -- Generate receipt number
    receipt_number := 'SP-' || p_request_id || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
    
    -- Get current collector cash balance
    SELECT COALESCE(balance_after, 0) INTO current_balance
    FROM collector_cash_on_hand 
    WHERE collector_id = p_collector_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Calculate new balance
    new_balance := current_balance + p_amount_collected;
    
    -- Update special pickup request with bag collection data
    UPDATE special_pickup_requests 
    SET 
        bag_quantity = p_bags_collected,
        final_price = p_amount_collected,
        estimated_total = p_bags_collected * 25.00, -- Update estimated based on actual bags
        payment_collected = TRUE,
        payment_method = p_payment_method,
        payment_date = CURRENT_TIMESTAMP,
        collector_notes = p_collector_notes,
        status = 'collected',
        updated_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;
    
    -- Create invoice and mark as paid immediately (since collector collected cash)
    PERFORM create_special_pickup_invoice(p_request_id);
    
    -- Record payment
    INSERT INTO special_pickup_payments (
        request_id, collector_id, amount_collected, payment_method, 
        receipt_number, notes
    ) VALUES (
        p_request_id, p_collector_id, p_amount_collected, p_payment_method,
        receipt_number, p_collector_notes
    ) RETURNING * INTO payment_record;
    
    -- Update collector cash on hand
    INSERT INTO collector_cash_on_hand (
        collector_id, transaction_type, amount, reference_id, reference_type,
        balance_before, balance_after, notes
    ) VALUES (
        p_collector_id, 'collection', p_amount_collected, p_request_id, 'special_pickup',
        current_balance, new_balance, 
        'Special pickup payment collected - ' || p_bags_collected || ' bags at ₱25 each'
    );
    
    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'receipt_number', receipt_number,
        'amount_collected', p_amount_collected,
        'bags_collected', p_bags_collected,
        'price_per_bag', 25.00,
        'collector_balance', new_balance,
        'payment_id', payment_record.payment_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get collector cash summary
CREATE OR REPLACE FUNCTION get_collector_cash_summary(p_collector_id INTEGER)
RETURNS JSON AS $$
DECLARE
    current_balance DECIMAL(10,2) := 0;
    today_collections DECIMAL(10,2) := 0;
    pending_deposits DECIMAL(10,2) := 0;
    total_collections DECIMAL(10,2) := 0;
BEGIN
    -- Get current balance
    SELECT COALESCE(balance_after, 0) INTO current_balance
    FROM collector_cash_on_hand 
    WHERE collector_id = p_collector_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Get today's collections
    SELECT COALESCE(SUM(amount), 0) INTO today_collections
    FROM collector_cash_on_hand
    WHERE collector_id = p_collector_id
    AND transaction_type = 'collection'
    AND DATE(transaction_date) = CURRENT_DATE;
    
    -- Get total collections this week
    SELECT COALESCE(SUM(amount), 0) INTO total_collections
    FROM collector_cash_on_hand
    WHERE collector_id = p_collector_id
    AND transaction_type = 'collection'
    AND transaction_date >= DATE_TRUNC('week', CURRENT_DATE);
    
    RETURN json_build_object(
        'current_balance', current_balance,
        'today_collections', today_collections,
        'week_collections', total_collections,
        'pending_deposits', current_balance -- All cash on hand is pending deposit
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_special_pickup_payments_request_id ON special_pickup_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_payments_collector_id ON special_pickup_payments(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_cash_collector_id ON collector_cash_on_hand(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_cash_date ON collector_cash_on_hand(transaction_date);

-- 7. Enhanced function to create invoice and mark as paid when collector confirms payment
CREATE OR REPLACE FUNCTION create_special_pickup_invoice(pickup_request_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    pickup_record RECORD;
    new_invoice_id INTEGER;
    invoice_number_val VARCHAR(20);
    payment_record_id INTEGER;
BEGIN
    -- Get the special pickup details
    SELECT spr.*, u.user_id 
    INTO pickup_record
    FROM special_pickup_requests spr
    JOIN users u ON spr.user_id = u.user_id
    WHERE spr.request_id = pickup_request_id
    AND spr.final_price IS NOT NULL
    AND spr.final_price > 0
    AND spr.payment_collected = TRUE; -- Only create invoice if payment was collected
    
    -- Check if pickup exists and payment was collected
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Special pickup not found, no price set, or payment not collected for request_id: %', pickup_request_id;
    END IF;
    
    -- Check if invoice already exists
    IF EXISTS (
        SELECT 1 FROM invoices 
        WHERE description ILIKE '%Special Pickup%' 
        AND user_id = pickup_record.user_id
        AND amount = pickup_record.final_price
        AND DATE(created_at) = DATE(pickup_record.updated_at)
    ) THEN
        RAISE NOTICE 'Invoice already exists for special pickup request_id: %', pickup_request_id;
        RETURN NULL;
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
        pickup_record.pickup_date, -- Due date same as pickup date since already paid
        'paid', -- Mark as PAID immediately
        CURRENT_DATE,
        pickup_record.pickup_date,
        pickup_record.pickup_date,
        'special',
        'Special Pickup - ' || pickup_record.waste_type || ' (' || pickup_record.bag_quantity || ' bags)',
        'Generated from special pickup request #' || pickup_request_id || ' - Payment collected by collector',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING invoice_id INTO new_invoice_id;
    
    -- Create corresponding payment record in the invoices payment system
    INSERT INTO payments (
        invoice_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        created_at
    ) VALUES (
        new_invoice_id,
        pickup_record.final_price,
        pickup_record.payment_method,
        pickup_record.payment_date,
        'SP-CASH-' || pickup_request_id,
        'Cash payment collected by collector for special pickup',
        pickup_record.payment_date
    ) RETURNING payment_id INTO payment_record_id;
    
    -- Log the creation
    RAISE NOTICE 'Created PAID invoice % and payment record % for special pickup request %', 
        new_invoice_id, payment_record_id, pickup_request_id;
    
    RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Update existing special pickup requests with bag-based defaults
UPDATE special_pickup_requests 
SET 
    bag_quantity = CASE WHEN final_price IS NOT NULL THEN CEIL(final_price / 25.0) ELSE 1 END,
    price_per_bag = 25.00,
    estimated_total = CASE WHEN final_price IS NOT NULL THEN final_price ELSE 25.00 END,
    payment_collected = CASE WHEN status = 'collected' THEN TRUE ELSE FALSE END
WHERE bag_quantity IS NULL;

COMMENT ON COLUMN special_pickup_requests.bag_quantity IS 'Number of 25kg rice sack size bags';
COMMENT ON COLUMN special_pickup_requests.price_per_bag IS 'Fixed price per bag: ₱25.00';
COMMENT ON COLUMN special_pickup_requests.estimated_total IS 'Estimated total cost: bag_quantity × ₱25';
COMMENT ON COLUMN special_pickup_requests.payment_collected IS 'Whether payment has been collected by collector';
COMMENT ON TABLE special_pickup_payments IS 'Tracks actual payment collection by collectors';
COMMENT ON TABLE collector_cash_on_hand IS 'Tracks collector cash balance and transactions';
