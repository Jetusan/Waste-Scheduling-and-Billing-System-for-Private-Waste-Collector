-- Create missing tables for special pickup system

-- 1. Create collector_cash_on_hand table
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

-- 2. Create special_pickup_payments table if it doesn't exist
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

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_cash_collector_id ON collector_cash_on_hand(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_cash_date ON collector_cash_on_hand(transaction_date);
CREATE INDEX IF NOT EXISTS idx_special_payments_request ON special_pickup_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_special_payments_collector ON special_pickup_payments(collector_id);

-- 4. Verify tables were created
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('collector_cash_on_hand', 'special_pickup_payments') 
ORDER BY table_name;
