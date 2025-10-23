-- Migration: Create manual_payment_verifications table and add fraud prevention columns
-- Date: 2025-10-24
-- Purpose: Create table if not exists and add image hash and fraud checks for enhanced security

-- First, create the manual_payment_verifications table if it doesn't exist
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

-- Add manual payment status to customer_subscriptions if not exists
ALTER TABLE customer_subscriptions 
ADD COLUMN IF NOT EXISTS manual_payment_status VARCHAR(20) DEFAULT NULL;
-- Values: null, 'pending_verification', 'verified', 'rejected'

-- Add image_hash column for duplicate detection
ALTER TABLE manual_payment_verifications 
ADD COLUMN IF NOT EXISTS image_hash VARCHAR(32);

-- Add fraud_checks column for storing fraud prevention data
ALTER TABLE manual_payment_verifications 
ADD COLUMN IF NOT EXISTS fraud_checks JSONB;

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_payments_user ON manual_payment_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payment_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_manual_payments_date ON manual_payment_verifications(payment_date);

-- Create fraud prevention indexes
CREATE INDEX IF NOT EXISTS idx_manual_payments_image_hash 
ON manual_payment_verifications(image_hash);

-- Create index on user_id and created_at for behavior analysis
CREATE INDEX IF NOT EXISTS idx_manual_payments_user_behavior 
ON manual_payment_verifications(user_id, created_at);

-- Add comments for documentation
COMMENT ON COLUMN manual_payment_verifications.image_hash IS 'MD5 hash of uploaded image for duplicate detection';
COMMENT ON COLUMN manual_payment_verifications.fraud_checks IS 'JSON data containing fraud prevention analysis results';

-- Update existing records to have empty fraud_checks (optional)
UPDATE manual_payment_verifications 
SET fraud_checks = '{"legacy": true, "timestamp": "2025-10-24T00:00:00Z"}'::jsonb
WHERE fraud_checks IS NULL;

COMMIT;
