-- Fix special pickup invoice creation function to work without service_start/service_end columns
-- This replaces the function to work with the current invoices table structure

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
    -- Using only columns that exist in the current invoices table
    INSERT INTO invoices (
        invoice_number,
        user_id,
        amount,
        due_date,
        status,
        generated_date,
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
        created_at,
        updated_at
    ) VALUES (
        new_invoice_id,
        pickup_record.final_price,
        'cash', -- Special pickups are always cash
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
