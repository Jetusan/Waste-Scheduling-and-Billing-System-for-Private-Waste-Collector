-- Manual Payment Verification System
CREATE TABLE IF NOT EXISTS manual_payment_verifications (
    verification_id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES customer_subscriptions(subscription_id),
    user_id INTEGER REFERENCES users(user_id),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'manual_gcash',
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100), -- User provided reference
    payment_proof_url VARCHAR(500), -- Uploaded screenshot path
    gcash_number VARCHAR(20), -- Sender's GCash number
    payment_date TIMESTAMP DEFAULT NOW(),
    verification_status VARCHAR(30) DEFAULT 'pending', -- pending, verified, rejected, auto_verified, auto_rejected, needs_review
    verified_by INTEGER REFERENCES users(user_id), -- Admin who verified
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    -- OCR Verification Fields
    ocr_confidence DECIMAL(5,2) DEFAULT 0, -- Confidence percentage (0-100)
    ocr_report TEXT, -- Detailed OCR verification report
    ocr_extracted_data JSONB, -- Extracted payment details as JSON
    auto_verified BOOLEAN DEFAULT FALSE, -- Whether it was auto-verified
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_manual_payments_user ON manual_payment_verifications(user_id);
CREATE INDEX idx_manual_payments_status ON manual_payment_verifications(verification_status);
CREATE INDEX idx_manual_payments_date ON manual_payment_verifications(payment_date);

-- Add manual payment status to customer_subscriptions
ALTER TABLE customer_subscriptions 
ADD COLUMN IF NOT EXISTS manual_payment_status VARCHAR(20) DEFAULT NULL;
-- Values: null, 'pending_verification', 'verified', 'rejected'
