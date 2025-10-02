    -- Payment Attempts Tracking Table
    -- Tracks every collection visit and payment attempt for cash subscriptions

    CREATE TABLE IF NOT EXISTS payment_attempts (
    attempt_id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES customer_subscriptions(subscription_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE, -- Can be resident_id or user_id depending on schema
    collector_id INTEGER REFERENCES collectors(collector_id) ON DELETE SET NULL,
    attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Outcome of the payment attempt
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN (
        'paid',                -- Successfully collected payment
        'not_home',           -- Resident not available
        'refused',            -- Resident refused to pay
        'promised_next_time', -- Resident promised to pay next time
        'no_cash',            -- Resident didn't have cash available
        'partial_payment',    -- Resident paid less than full amount
        'disputed',           -- Payment disputed by resident
        'cancelled'           -- Resident cancelled subscription
    )),
    
    -- Payment details
    amount_collected DECIMAL(10,2) DEFAULT 0,
    amount_expected DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    
    -- Location tracking (GPS verification)
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(10,8),
    location_accuracy DECIMAL(10,2), -- in meters
    
    -- Evidence and notes
    notes TEXT,
    photo_url TEXT, -- Optional photo of cash/receipt
    resident_signature TEXT, -- Digital signature if available
    
    -- Follow-up tracking
    retry_scheduled_date DATE,
    retry_count INTEGER DEFAULT 0,
    escalated BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_subscription ON payment_attempts(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_user ON payment_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_collector ON payment_attempts(collector_id);
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_date ON payment_attempts(attempt_date);
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_outcome ON payment_attempts(outcome);

    -- Add payment tracking columns to customer_subscriptions
    ALTER TABLE customer_subscriptions 
    ADD COLUMN IF NOT EXISTS payment_attempts_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_payment_attempt_date DATE,
    ADD COLUMN IF NOT EXISTS last_payment_attempt_outcome VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_score INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS requires_prepayment BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS grace_period_end DATE;

    -- Add payment reliability tracking to users table
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS payment_reliability_score INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS total_payments_made INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_payments_failed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_successful_payment_date DATE,
    ADD COLUMN IF NOT EXISTS consecutive_failed_attempts INTEGER DEFAULT 0;

    -- Function to update payment scores after each attempt
    CREATE OR REPLACE FUNCTION update_payment_scores()
    RETURNS TRIGGER AS $$
    BEGIN
    -- Update subscription payment attempts count
    UPDATE customer_subscriptions
    SET 
        payment_attempts_count = payment_attempts_count + 1,
        last_payment_attempt_date = NEW.attempt_date,
        last_payment_attempt_outcome = NEW.outcome,
        updated_at = CURRENT_TIMESTAMP
    WHERE subscription_id = NEW.subscription_id;
    
    -- Update payment score based on outcome
    IF NEW.outcome = 'paid' THEN
        -- Successful payment: increase score
        UPDATE customer_subscriptions
        SET payment_score = LEAST(payment_score + 10, 100)
        WHERE subscription_id = NEW.subscription_id;
        
        UPDATE users
        SET 
        payment_reliability_score = LEAST(payment_reliability_score + 10, 100),
        total_payments_made = total_payments_made + 1,
        last_successful_payment_date = NEW.attempt_date,
        consecutive_failed_attempts = 0
        WHERE user_id = NEW.user_id;
        
    ELSIF NEW.outcome IN ('not_home', 'no_cash', 'promised_next_time') THEN
        -- Minor failure: small penalty
        UPDATE customer_subscriptions
        SET payment_score = GREATEST(payment_score - 5, 0)
        WHERE subscription_id = NEW.subscription_id;
        
        UPDATE users
        SET 
        payment_reliability_score = GREATEST(payment_reliability_score - 5, 0),
        total_payments_failed = total_payments_failed + 1,
        consecutive_failed_attempts = consecutive_failed_attempts + 1
        WHERE user_id = NEW.user_id;
        
    ELSIF NEW.outcome IN ('refused', 'disputed', 'cancelled') THEN
        -- Major failure: significant penalty
        UPDATE customer_subscriptions
        SET payment_score = GREATEST(payment_score - 15, 0)
        WHERE subscription_id = NEW.subscription_id;
        
        UPDATE users
        SET 
        payment_reliability_score = GREATEST(payment_reliability_score - 15, 0),
        total_payments_failed = total_payments_failed + 1,
        consecutive_failed_attempts = consecutive_failed_attempts + 1
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Check if prepayment should be required (score below 50)
    UPDATE customer_subscriptions
    SET requires_prepayment = TRUE
    WHERE subscription_id = NEW.subscription_id
        AND payment_score < 50;
    
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger to automatically update scores
    DROP TRIGGER IF EXISTS trigger_update_payment_scores ON payment_attempts;
    CREATE TRIGGER trigger_update_payment_scores
    AFTER INSERT ON payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_scores();

    -- Function to auto-suspend subscriptions after 3 failed attempts
    CREATE OR REPLACE FUNCTION check_suspension_criteria()
    RETURNS TRIGGER AS $$
    DECLARE
    failed_count INTEGER;
    BEGIN
    -- Count consecutive failed attempts in last 10 days
    SELECT COUNT(*)
    INTO failed_count
    FROM payment_attempts
    WHERE subscription_id = NEW.subscription_id
        AND outcome IN ('not_home', 'refused', 'no_cash', 'promised_next_time')
        AND attempt_date >= CURRENT_DATE - INTERVAL '10 days'
    ORDER BY attempt_date DESC
    LIMIT 3;
    
    -- Suspend if 3 or more failed attempts
    IF failed_count >= 3 THEN
        UPDATE customer_subscriptions
        SET 
        status = 'suspended',
        suspension_reason = 'Three consecutive failed payment attempts',
        suspended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = NEW.subscription_id
        AND status != 'suspended'; -- Don't re-suspend
    END IF;
    
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger for auto-suspension
    DROP TRIGGER IF EXISTS trigger_check_suspension ON payment_attempts;
    CREATE TRIGGER trigger_check_suspension
    AFTER INSERT ON payment_attempts
    FOR EACH ROW
    WHEN (NEW.outcome IN ('not_home', 'refused', 'no_cash', 'promised_next_time'))
    EXECUTE FUNCTION check_suspension_criteria();

    -- View for payment attempt analytics
    CREATE OR REPLACE VIEW payment_attempt_analytics AS
    SELECT 
    pa.user_id,
    u.username,
    CONCAT(un.first_name, ' ', un.last_name) as full_name,
    pa.subscription_id,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN pa.outcome = 'paid' THEN 1 ELSE 0 END) as successful_attempts,
    SUM(CASE WHEN pa.outcome != 'paid' THEN 1 ELSE 0 END) as failed_attempts,
    ROUND(
        (SUM(CASE WHEN pa.outcome = 'paid' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as success_rate,
    SUM(pa.amount_collected) as total_collected,
    MAX(pa.attempt_date) as last_attempt_date,
    MAX(CASE WHEN pa.outcome = 'paid' THEN pa.attempt_date END) as last_successful_payment,
    u.payment_reliability_score,
    cs.payment_score,
    cs.requires_prepayment
    FROM payment_attempts pa
    JOIN users u ON pa.user_id = u.user_id
    LEFT JOIN user_names un ON u.name_id = un.name_id
    JOIN customer_subscriptions cs ON pa.subscription_id = cs.subscription_id
    GROUP BY pa.user_id, u.username, un.first_name, un.last_name, pa.subscription_id, 
            u.payment_reliability_score, cs.payment_score, cs.requires_prepayment;

    -- View for collector performance
    CREATE OR REPLACE VIEW collector_payment_performance AS
    SELECT 
    pa.collector_id,
    u.username as collector_username,
    CONCAT(un.first_name, ' ', un.last_name) as collector_name,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN pa.outcome = 'paid' THEN 1 ELSE 0 END) as successful_collections,
    SUM(CASE WHEN pa.outcome != 'paid' THEN 1 ELSE 0 END) as failed_collections,
    ROUND(
        (SUM(CASE WHEN pa.outcome = 'paid' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as collection_rate,
    SUM(pa.amount_collected) as total_amount_collected,
    AVG(pa.amount_collected) FILTER (WHERE pa.outcome = 'paid') as avg_collection_amount,
    COUNT(DISTINCT pa.user_id) as unique_residents_served,
    MAX(pa.attempt_date) as last_collection_date
    FROM payment_attempts pa
    JOIN collectors c ON pa.collector_id = c.collector_id
    JOIN users u ON c.user_id = u.user_id
    LEFT JOIN user_names un ON u.name_id = un.name_id
    GROUP BY pa.collector_id, u.username, un.first_name, un.last_name;

    COMMENT ON TABLE payment_attempts IS 'Tracks every cash payment collection attempt with outcome and location data';
    COMMENT ON COLUMN payment_attempts.outcome IS 'Result of payment attempt: paid, not_home, refused, etc.';
    COMMENT ON COLUMN payment_attempts.location_lat IS 'GPS latitude where payment attempt was made';
    COMMENT ON COLUMN payment_attempts.location_lng IS 'GPS longitude where payment attempt was made';
    COMMENT ON COLUMN payment_attempts.retry_scheduled_date IS 'Date when retry collection is scheduled';
    COMMENT ON COLUMN customer_subscriptions.payment_score IS 'Payment reliability score (0-100), affects service priority';
    COMMENT ON COLUMN customer_subscriptions.requires_prepayment IS 'If true, resident must switch to prepayment (GCash) or pay deposit';
