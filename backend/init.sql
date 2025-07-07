-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL
);

-- Create barangays table
CREATE TABLE IF NOT EXISTS barangays (
    barangay_id SERIAL PRIMARY KEY,
    barangay_name VARCHAR(100) NOT NULL,
    city_id INTEGER REFERENCES cities(city_id)
);

-- Create subdivisions table
CREATE TABLE IF NOT EXISTS subdivisions (
    subdivision_id SERIAL PRIMARY KEY,
    subdivision_name VARCHAR(200) NOT NULL,
    barangay_id INTEGER REFERENCES barangays(barangay_id),
    description TEXT,
    website VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_names table
CREATE TABLE IF NOT EXISTS user_names (
    name_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(200) NOT NULL,
    barangay_id INTEGER REFERENCES barangays(barangay_id),
    subdivision_id INTEGER REFERENCES subdivisions(subdivision_id),
    city_id INTEGER REFERENCES cities(city_id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    address_id INTEGER REFERENCES addresses(address_id),
    name_id INTEGER REFERENCES user_names(name_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trucks table
CREATE TABLE IF NOT EXISTS trucks (
    truck_id VARCHAR(10) PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    truck_type VARCHAR(50) NOT NULL,
    capacity_tons DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'active',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    driver_id SERIAL PRIMARY KEY,
    name_id INTEGER REFERENCES user_names(name_id),
    license_number VARCHAR(20) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create collection_teams table
CREATE TABLE IF NOT EXISTS collection_teams (
    team_id SERIAL PRIMARY KEY,
    truck_id VARCHAR(10) REFERENCES trucks(truck_id),
    driver_id INTEGER REFERENCES drivers(driver_id),
    team_name VARCHAR(50) NOT NULL,
    team_size INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create route_types table
CREATE TABLE IF NOT EXISTS route_types (
    route_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create collection_routes table
CREATE TABLE IF NOT EXISTS collection_routes (
    route_id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    route_type_id INTEGER REFERENCES route_types(route_type_id),
    estimated_duration_minutes INTEGER,
    total_distance_km DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create route_stops table
CREATE TABLE IF NOT EXISTS route_stops (
    stop_id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES collection_routes(route_id),
    subdivision_id INTEGER REFERENCES subdivisions(subdivision_id),
    stop_order INTEGER NOT NULL,
    estimated_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create schedule_types table
CREATE TABLE IF NOT EXISTS schedule_types (
    schedule_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create collection_schedules table
CREATE TABLE IF NOT EXISTS collection_schedules (
    schedule_id SERIAL PRIMARY KEY,
    collection_id VARCHAR(10) UNIQUE NOT NULL,
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

-- Create schedule_status_history table
CREATE TABLE IF NOT EXISTS schedule_status_history (
    history_id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES collection_schedules(schedule_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(user_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data
INSERT INTO route_types (type_name, description) VALUES
    ('Regular', 'Regular weekly collection route'),
    ('Special', 'Special collection requests'),
    ('Holiday', 'Holiday schedule adjustments')
ON CONFLICT DO NOTHING;

INSERT INTO schedule_types (type_name, description) VALUES
    ('Regular', 'Regular scheduled collection'),
    ('Special', 'Special collection request'),
    ('Make-up', 'Make-up collection for missed schedule'),
    ('Holiday', 'Holiday collection schedule')
ON CONFLICT DO NOTHING;

-- Insert default trucks
INSERT INTO trucks (truck_id, plate_number, truck_type, capacity_tons) VALUES
    ('TR-001', 'ABC123', 'Garbage Truck', 10.00),
    ('TR-002', 'XYZ789', 'Garbage Truck', 10.00)
ON CONFLICT DO NOTHING;

-- Insert default city
INSERT INTO cities (city_name)
VALUES ('General Santos City')
ON CONFLICT (city_name) DO NOTHING;

-- Get the city_id and insert barangays and subdivisions
DO $$
DECLARE
    v_city_id INTEGER;
    v_barangay_id INTEGER;
BEGIN
    SELECT city_id INTO v_city_id FROM cities WHERE city_name = 'General Santos City';

    -- Insert barangays
    INSERT INTO barangays (barangay_name, city_id)
    VALUES 
        ('Apopong', v_city_id),
        ('Baluan', v_city_id),
        ('Batomelong', v_city_id),
        ('Buayan', v_city_id),
        ('Calumpang', v_city_id),
        ('City Heights', v_city_id),
        ('Conel', v_city_id),
        ('Dadiangas East', v_city_id),
        ('Dadiangas North', v_city_id),
        ('Dadiangas South', v_city_id),
        ('Dadiangas West', v_city_id),
        ('Fatima', v_city_id),
        ('Katangawan', v_city_id),
        ('Labangal', v_city_id),
        ('Lagao', v_city_id),
        ('Ligaya', v_city_id),
        ('Mabuhay', v_city_id),
        ('San Isidro', v_city_id),
        ('San Jose', v_city_id),
        ('Siguel', v_city_id),
        ('Sinawal', v_city_id),
        ('Tambler', v_city_id),
        ('Tinagacan', v_city_id),
        ('Upper Labay', v_city_id)
    ON CONFLICT DO NOTHING;

    -- Insert subdivisions for each barangay
    -- San Isidro
    SELECT barangay_id INTO v_barangay_id FROM barangays WHERE barangay_name = 'San Isidro';
    INSERT INTO subdivisions (subdivision_name, barangay_id, description, website) 
    VALUES ('Lessandra Gensan', v_barangay_id, 'A five-hectare, Caribbean-inspired subdivision offering quality and affordable house and lots', 'lessandra.com.ph')
    ON CONFLICT DO NOTHING;

    -- Lagao
    SELECT barangay_id INTO v_barangay_id FROM barangays WHERE barangay_name = 'Lagao';
    INSERT INTO subdivisions (subdivision_name, barangay_id, description, website) 
    VALUES ('Agan Homes', v_barangay_id, 'A residential community situated along the National Highway, providing various house and lot options', 'bloomfieldsgensanhomes.phproperty.com')
    ON CONFLICT DO NOTHING;

    -- Mabuhay
    SELECT barangay_id INTO v_barangay_id FROM barangays WHERE barangay_name = 'Mabuhay';
    INSERT INTO subdivisions (subdivision_name, barangay_id, description, website) 
    VALUES ('Sora Residences', v_barangay_id, 'An exclusive subdivision located along Diversion Road, Purok Golingan, featuring amenities like a clubhouse, swimming pool, and playground', 'onepropertee.com')
    ON CONFLICT DO NOTHING;

    -- General Santos City (Barangay unspecified)
    INSERT INTO subdivisions (subdivision_name, barangay_id, description, website) 
    VALUES ('Doña Soledad Subdivision', NULL, 'A residential area offering house and lot packages', 'bria.com.ph')
    ON CONFLICT DO NOTHING;

    -- Katangawan
    SELECT barangay_id INTO v_barangay_id FROM barangays WHERE barangay_name = 'Katangawan';
    INSERT INTO subdivisions (subdivision_name, barangay_id, description, website) 
    VALUES ('Lacewood Subdivision', v_barangay_id, 'Situated along Nursery Road, this subdivision offers affordable housing options', 'facebook.com')
    ON CONFLICT DO NOTHING;

    -- Insert other subdivisions
    INSERT INTO subdivisions (subdivision_name, description, website) 
    VALUES 
        ('Bria Homes Gensan', 'A community offering house and lot packages with amenities such as a multi-purpose hall and playground', 'bria.com.ph'),
        ('Bloomfields General Santos', 'Located along the National Highway, near educational institutions and shopping centers', NULL),
        ('Camella Homes General Santos', 'A residential community offering various house models and financing options', 'lessandra.com.ph')
    ON CONFLICT DO NOTHING;

    -- Calumpang
    SELECT barangay_id INTO v_barangay_id FROM barangays WHERE barangay_name = 'Calumpang';
    INSERT INTO subdivisions (subdivision_name, barangay_id, description, website) 
    VALUES ('Deca Homes Bayview', v_barangay_id, 'A socialized to low-cost housing subdivision providing affordable housing solutions', 'davaocityproperty.com')
    ON CONFLICT DO NOTHING;

    -- Insert Villa Senorita (Barangay unspecified)
    INSERT INTO subdivisions (subdivision_name, description) 
    VALUES ('Villa Senorita', 'A subdivision offering house and lot packages with amenities like a clubhouse and swimming pool')
    ON CONFLICT DO NOTHING;

END $$; 