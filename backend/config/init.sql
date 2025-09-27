-- UNIFIED DATABASE SCHEMA FOR WASTE MANAGEMENT SYSTEM
-- This file consolidates all previous .sql schema files (waste_collection_tables.sql, waste_management_tables.sql, billing_tables.sql, migration.sql)
-- All tables for users, collection, billing, notifications, etc. are defined here.

-- =====================
-- SHARED/CORE TABLES
-- =====================

-- Cities
CREATE TABLE IF NOT EXISTS cities (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL
);

-- Barangays
CREATE TABLE IF NOT EXISTS barangays (
    barangay_id SERIAL PRIMARY KEY,
    barangay_name VARCHAR(100) NOT NULL,
    city_id INTEGER REFERENCES cities(city_id)
);

-- Subdivisions
CREATE TABLE IF NOT EXISTS subdivisions (
    subdivision_id SERIAL PRIMARY KEY,
    subdivision_name VARCHAR(200) NOT NULL,
    barangay_id INTEGER REFERENCES barangays(barangay_id),
    description TEXT,
    website VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Names
CREATE TABLE IF NOT EXISTS user_names (
    name_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL
);

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(200) NOT NULL,
    barangay_id INTEGER REFERENCES barangays(barangay_id),
    subdivision_id INTEGER REFERENCES subdivisions(subdivision_id),
    city_id INTEGER REFERENCES cities(city_id)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    address_id INTEGER REFERENCES addresses(address_id),
    name_id INTEGER REFERENCES user_names(name_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- =====================
-- COLLECTION TABLES
-- =====================

-- Trucks
CREATE TABLE IF NOT EXISTS trucks (
    truck_id SERIAL PRIMARY KEY,
    truck_number VARCHAR(20) UNIQUE NOT NULL,
    driver_name VARCHAR(100),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    truck_type VARCHAR(50),
    capacity_tons DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'active',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collectors
CREATE TABLE IF NOT EXISTS collectors (
    collector_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    truck_id INTEGER REFERENCES trucks(truck_id),
    license_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection Teams
CREATE TABLE IF NOT EXISTS collection_teams (
    team_id SERIAL PRIMARY KEY,
    truck_id INTEGER REFERENCES trucks(truck_id),
    driver_id INTEGER,
    team_name VARCHAR(50) NOT NULL,
    team_size INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Route Types
CREATE TABLE IF NOT EXISTS route_types (
    route_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection Routes
CREATE TABLE IF NOT EXISTS collection_routes (
    route_id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    route_type_id INTEGER REFERENCES route_types(route_type_id),
    estimated_duration_minutes INTEGER,
    total_distance_km DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Route Stops
CREATE TABLE IF NOT EXISTS route_stops (
    stop_id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES collection_routes(route_id),
    subdivision_id INTEGER REFERENCES subdivisions(subdivision_id),
    stop_order INTEGER NOT NULL,
    estimated_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Types
CREATE TABLE IF NOT EXISTS schedule_types (
    schedule_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection Schedules
CREATE TABLE IF NOT EXISTS collection_schedules (
    schedule_id SERIAL PRIMARY KEY,
    collection_id VARCHAR(10) UNIQUE,
    route_id INTEGER REFERENCES collection_routes(route_id),
    team_id INTEGER REFERENCES collection_teams(team_id),
    schedule_type_id INTEGER REFERENCES schedule_types(schedule_type_id),
    collection_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Residents
CREATE TABLE IF NOT EXISTS residents (
    resident_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    address TEXT NOT NULL,
    subdivision_id INTEGER REFERENCES subdivisions(subdivision_id),
    subscription_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    report_id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,           -- e.g., 'Waste Collection', 'User Activity'
    period VARCHAR(20) NOT NULL,         -- e.g., 'Weekly', 'Monthly', 'Custom'
    generated_by VARCHAR(100) NOT NULL,  -- e.g., 'Admin User'
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Pending',-- e.g., 'Completed', 'Pending', 'Draft'
    schedule VARCHAR(100),               -- e.g., 'Weekly - Mon 9AM'
    format VARCHAR(10) DEFAULT 'pdf',    -- e.g., 'pdf', 'excel', 'csv'
    recipients TEXT,                     -- comma-separated emails for sharing/scheduling
    message TEXT,                        -- optional message for sharing
    start_date DATE,                     -- for custom period
    end_date DATE                        -- for custom period
);

-- Schedule Status History
CREATE TABLE IF NOT EXISTS schedule_status_history (
    history_id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES collection_schedules(schedule_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(user_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- BILLING TABLES
-- =====================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'weekly')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Subscriptions
CREATE TABLE IF NOT EXISTS customer_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(plan_id) ON DELETE RESTRICT,
    billing_start_date DATE NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resident_id, plan_id)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    subscription_id INTEGER REFERENCES customer_subscriptions(subscription_id) ON DELETE CASCADE,
    resident_id INTEGER REFERENCES users(user_id),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    generated_date DATE NOT NULL,
    service_start DATE,
    service_end DATE,
    invoice_type VARCHAR(30) DEFAULT 'regular' CHECK (invoice_type IN ('regular', 'special', 'adjustment')),
    late_fees DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    is_voided BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- If the invoices table already exists, use ALTER TABLE statements to add new columns as needed.

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(50),
    collector_id INTEGER REFERENCES collectors(collector_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment History
CREATE TABLE IF NOT EXISTS payment_history (
    history_id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'cancelled', 'refunded')),
    amount_before DECIMAL(10,2),
    amount_after DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- DEFAULT DATA & INDEXES
-- =====================

-- Insert default city (General Santos City)
INSERT INTO cities (city_name)
SELECT 'General Santos City'
WHERE NOT EXISTS (
    SELECT 1 FROM cities WHERE city_name = 'General Santos City'
);

-- Insert barangays for General Santos City
INSERT INTO barangays (barangay_name, city_id)
SELECT b.name, c.city_id
FROM (
    VALUES 
        ('Apopong'),
        ('Baluan'),
        ('Batomelong'),
        ('Buayan'),
        ('Calumpang'),
        ('City Heights'),
        ('Conel'),
        ('Dadiangas East'),
        ('Dadiangas North'),
        ('Dadiangas South'),
        ('Dadiangas West'),
        ('Fatima'),
        ('Katangawan'),
        ('Labangal'),
        ('Lagao'),
        ('Ligaya'),
        ('Mabuhay'),
        ('San Isidro'),
        ('San Jose'),
        ('Siguel'),
        ('Sinawal'),
        ('Tambler'),
        ('Tinagacan'),
        ('Upper Labay')
) AS b(name)
CROSS JOIN cities c
WHERE c.city_name = 'General Santos City'
AND NOT EXISTS (
    SELECT 1 
    FROM barangays 
    WHERE barangay_name = b.name
);

-- Insert default roles
INSERT INTO roles (role_name) VALUES
  ('admin'),
  ('collector'),
  ('resident')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, price, frequency, description) VALUES
    ('Household', 1200.00, 'monthly', 'Standard household waste collection service'),
    ('Mixed/Heavy', 850.00, 'weekly', 'Heavy waste and mixed materials collection service')
ON CONFLICT (plan_name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_resident_id ON customer_subscriptions(resident_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_plan_id ON customer_subscriptions(plan_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at 
    BEFORE UPDATE ON customer_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- SPECIAL PICKUP TABLES
-- =====================

-- Special Pickup Requests
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_pickup_collector_id ON special_pickup_requests(collector_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_user_id ON special_pickup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_status ON special_pickup_requests(status);

-- Insert sample special pickup data for testing
INSERT INTO special_pickup_requests (user_id, collector_id, waste_type, description, pickup_date, pickup_time, address, notes, status) VALUES
(141, 29, 'Electronic Waste', 'Old computer and monitor disposal', CURRENT_DATE + INTERVAL '1 day', '10:00:00', '123 Lagao Street, General Santos City', 'Heavy items, need assistance', 'in_progress'),
(141, 29, 'Furniture', 'Old sofa and table', CURRENT_DATE + INTERVAL '2 days', '14:00:00', '456 Buayan Avenue, General Santos City', 'Large items', 'in_progress'),
(141, 29, 'Garden Waste', 'Tree branches and leaves', CURRENT_DATE, '08:00:00', '789 Dadiangas Road, General Santos City', 'Organic waste only', 'in_progress')
ON CONFLICT DO NOTHING; 