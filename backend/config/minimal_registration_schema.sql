-- Minimal schema for registration (excluding user_names, which you already have)

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
