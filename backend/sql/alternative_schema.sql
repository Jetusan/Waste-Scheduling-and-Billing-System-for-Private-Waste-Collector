-- ALTERNATIVE: Modify existing tables instead of creating new one

-- Option 1: Add fields to customer_subscriptions table
ALTER TABLE customer_subscriptions 
ADD COLUMN IF NOT EXISTS payment_proof_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS sender_gcash_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocr_report TEXT,
ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Option 2: Add fields to invoices table  
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_proof_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'verified',
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocr_report TEXT,
ADD COLUMN IF NOT EXISTS sender_gcash_number VARCHAR(20);

-- However, this approach has drawbacks:
-- 1. Clutters existing tables with verification-specific fields
-- 2. Makes queries more complex
-- 3. Harder to maintain separation of concerns
-- 4. No proper audit trail for verification process
