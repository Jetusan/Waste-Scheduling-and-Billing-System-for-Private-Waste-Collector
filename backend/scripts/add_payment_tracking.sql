-- Add payment tracking table for GCash/PayMongo integration
CREATE TABLE IF NOT EXISTS payment_sources (
    source_id VARCHAR(100) PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- in centavos
    currency VARCHAR(3) DEFAULT 'PHP',
    payment_method VARCHAR(50) DEFAULT 'gcash',
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    checkout_url TEXT,
    redirect_success TEXT,
    redirect_failed TEXT,
    webhook_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_sources_updated_at
    BEFORE UPDATE ON payment_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_sources_updated_at();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_sources_status ON payment_sources(status);
CREATE INDEX IF NOT EXISTS idx_payment_sources_invoice ON payment_sources(invoice_id);
