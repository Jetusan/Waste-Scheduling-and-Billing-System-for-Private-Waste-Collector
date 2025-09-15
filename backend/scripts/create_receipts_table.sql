-- Create receipts table to store generated receipts
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    payment_source_id VARCHAR(100), -- For GCash payments
    payment_id INTEGER, -- For cash payments
    invoice_id INTEGER REFERENCES invoices(invoice_id),
    user_id INTEGER REFERENCES users(user_id),
    subscription_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    receipt_data JSONB, -- Store all receipt details as JSON
    receipt_html TEXT, -- Store the generated HTML receipt
    status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'downloaded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_payment_source_id ON receipts(payment_source_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_receipts_updated_at 
    BEFORE UPDATE ON receipts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate receipt numbers function
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('receipts_receipt_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
