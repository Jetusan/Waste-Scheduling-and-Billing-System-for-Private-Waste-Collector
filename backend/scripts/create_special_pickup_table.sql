-- Create special pickup requests table
CREATE TABLE IF NOT EXISTS special_pickup_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    collector_id INTEGER REFERENCES collectors(collector_id) ON DELETE SET NULL,
    waste_type VARCHAR(100) NOT NULL,
    description TEXT,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    image_url VARCHAR(500),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'collected', 'cancelled')),
    final_price DECIMAL(10,2),
    price_status VARCHAR(20) DEFAULT 'pending' CHECK (price_status IN ('pending', 'negotiating', 'agreed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_special_pickup_collector_id ON special_pickup_requests(collector_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_user_id ON special_pickup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_status ON special_pickup_requests(status);

-- Insert some sample data for testing
INSERT INTO special_pickup_requests (user_id, collector_id, waste_type, description, pickup_date, pickup_time, address, notes, status) VALUES
(141, 29, 'Electronic Waste', 'Old computer and monitor disposal', CURRENT_DATE + INTERVAL '1 day', '10:00:00', '123 Lagao Street, General Santos City', 'Heavy items, need assistance', 'in_progress'),
(141, 29, 'Furniture', 'Old sofa and table', CURRENT_DATE + INTERVAL '2 days', '14:00:00', '456 Buayan Avenue, General Santos City', 'Large items', 'in_progress'),
(141, 29, 'Garden Waste', 'Tree branches and leaves', CURRENT_DATE, '08:00:00', '789 Dadiangas Road, General Santos City', 'Organic waste only', 'in_progress')
ON CONFLICT DO NOTHING;
