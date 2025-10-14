-- Fix missing collection_routes table and related dependencies
-- This script creates the missing tables needed for collector schedules

-- Route Types (if not exists)
CREATE TABLE IF NOT EXISTS route_types (
    route_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection Routes (the missing table)
CREATE TABLE IF NOT EXISTS collection_routes (
    route_id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    route_type_id INTEGER REFERENCES route_types(route_type_id),
    barangay_id INTEGER REFERENCES barangays(barangay_id),
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

-- Schedule Types (if not exists)
CREATE TABLE IF NOT EXISTS schedule_types (
    schedule_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default route types
INSERT INTO route_types (type_name, description) VALUES 
('Regular', 'Regular collection route'),
('Special', 'Special pickup route'),
('Emergency', 'Emergency collection route')
ON CONFLICT DO NOTHING;

-- Insert default schedule types
INSERT INTO schedule_types (type_name, description) VALUES 
('Regular Pickup', 'Regular waste collection'),
('Special Pickup', 'Special waste collection'),
('Recycling', 'Recycling collection'),
('Bulk Waste', 'Bulk waste collection')
ON CONFLICT DO NOTHING;

-- Insert sample collection routes for existing barangays
INSERT INTO collection_routes (route_name, route_type_id, barangay_id, estimated_duration_minutes, total_distance_km)
SELECT 
    CONCAT(b.barangay_name, ' Route 1') as route_name,
    1 as route_type_id, -- Regular route type
    b.barangay_id,
    120 as estimated_duration_minutes, -- 2 hours
    5.0 as total_distance_km
FROM barangays b
WHERE NOT EXISTS (
    SELECT 1 FROM collection_routes cr WHERE cr.barangay_id = b.barangay_id
);

-- Update existing collection_schedules to have route_id if they don't have one
-- This creates a basic route for schedules that don't have routes assigned
DO $$
DECLARE
    default_route_id INTEGER;
BEGIN
    -- Get or create a default route
    SELECT route_id INTO default_route_id 
    FROM collection_routes 
    WHERE route_name = 'Default Route' 
    LIMIT 1;
    
    IF default_route_id IS NULL THEN
        INSERT INTO collection_routes (route_name, route_type_id, estimated_duration_minutes, total_distance_km)
        VALUES ('Default Route', 1, 60, 3.0)
        RETURNING route_id INTO default_route_id;
    END IF;
    
    -- Update schedules without route_id
    UPDATE collection_schedules 
    SET route_id = default_route_id 
    WHERE route_id IS NULL;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collection_routes_barangay ON collection_routes(barangay_id);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_route ON collection_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_team ON collection_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_date ON collection_schedules(collection_date);

-- Verify the tables were created
SELECT 'collection_routes' as table_name, COUNT(*) as record_count FROM collection_routes
UNION ALL
SELECT 'route_types' as table_name, COUNT(*) as record_count FROM route_types
UNION ALL
SELECT 'schedule_types' as table_name, COUNT(*) as record_count FROM schedule_types;
