-- CREATE INVOICES FOR SPECIAL PICKUPS
-- This script creates a function to automatically generate invoices when special pickups are completed

-- 1. Function to create invoice for special pickup
CREATE OR REPLACE FUNCTION create_special_pickup_invoice(pickup_request_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    pickup_record RECORD;
    new_invoice_id INTEGER;
    invoice_number_val VARCHAR(20);
BEGIN
    -- Get the special pickup details
    SELECT spr.*, u.user_id 
    INTO pickup_record
    FROM special_pickup_requests spr
    JOIN users u ON spr.user_id = u.user_id
    WHERE spr.request_id = pickup_request_id
    AND spr.final_price IS NOT NULL
    AND spr.final_price > 0;
    
    -- Check if pickup exists and has a price
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Special pickup not found or no price set for request_id: %', pickup_request_id;
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
    
    -- Create the invoice
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
        pickup_record.pickup_date + INTERVAL '7 days', -- Due 7 days after pickup
        'unpaid',
        CURRENT_DATE,
        pickup_record.pickup_date,
        pickup_record.pickup_date,
        'special',
        'Special Pickup - ' || pickup_record.waste_type,
        'Generated from special pickup request #' || pickup_request_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING invoice_id INTO new_invoice_id;
    
    -- Log the creation
    RAISE NOTICE 'Created invoice % for special pickup request %', new_invoice_id, pickup_request_id;
    
    RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to automatically create invoices when special pickup is collected
CREATE OR REPLACE FUNCTION trigger_create_special_pickup_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create invoice when status changes to 'collected' and price is set
    IF NEW.status = 'collected' AND NEW.final_price IS NOT NULL AND NEW.final_price > 0 THEN
        -- Check if this is a status change (not initial insert)
        IF OLD IS NULL OR OLD.status != 'collected' THEN
            PERFORM create_special_pickup_invoice(NEW.request_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger on special_pickup_requests
DROP TRIGGER IF EXISTS auto_create_special_pickup_invoice ON special_pickup_requests;

CREATE TRIGGER auto_create_special_pickup_invoice
    AFTER INSERT OR UPDATE ON special_pickup_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_special_pickup_invoice();

-- 4. Backfill existing completed special pickups
DO $$
DECLARE
    pickup_record RECORD;
    created_count INTEGER := 0;
BEGIN
    -- Create invoices for existing collected special pickups that don't have invoices
    FOR pickup_record IN 
        SELECT request_id 
        FROM special_pickup_requests 
        WHERE status = 'collected' 
        AND final_price IS NOT NULL 
        AND final_price > 0
    LOOP
        BEGIN
            PERFORM create_special_pickup_invoice(pickup_record.request_id);
            created_count := created_count + 1;
        EXCEPTION 
            WHEN OTHERS THEN
                -- Skip if invoice already exists or other error
                CONTINUE;
        END;
    END LOOP;
    
    RAISE NOTICE 'Backfilled % invoices for existing special pickups', created_count;
END $$;
