-- =====================================================
-- RECOMMENDED NORMALIZED SCHEMA FOR WSBS USERS TABLE
-- Balances normalization with performance for your use case
-- =====================================================

-- 1. USERS Table (Main table - keep personal info together)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    
    -- Personal Information (Keep together - frequently accessed together)
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    
    -- Computed full name for reporting (faster than JOIN)
    full_name TEXT GENERATED ALWAYS AS (
        first_name || 
        COALESCE(' ' || NULLIF(middle_name, '') || ' ', ' ') || 
        last_name
    ) STORED,
    
    -- Account credentials
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Contact info (keep primary contact in users table for performance)
    primary_phone VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    
    -- Foreign keys to normalized tables
    address_id INTEGER REFERENCES addresses(address_id),
    role_id INTEGER REFERENCES roles(role_id) DEFAULT 1,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ADDRESSES Table (Normalized - matches your registration form exactly)
CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    
    -- Complete address components matching your WSBS registration
    house_number VARCHAR(20),           -- "e.g., 123, Block 5, Lot 10"
    street VARCHAR(200) NOT NULL,       -- "e.g., Maharlika Street, Blue Avenue" 
    purok VARCHAR(100),                 -- "e.g., Purok Maligaya, Green Valley Subd."
    barangay_name VARCHAR(100) NOT NULL, -- From dropdown selection
    city_name VARCHAR(100) NOT NULL DEFAULT 'General Santos City',
    landmark VARCHAR(200),              -- "e.g., Near SM Mall, Beside Catholic Church"
    
    -- Computed full address for reporting (PostgreSQL generated column)
    full_address TEXT GENERATED ALWAYS AS (
        COALESCE(house_number || ', ', '') ||
        street || ', ' ||
        COALESCE(purok || ', ', '') ||
        barangay_name || ', ' ||
        city_name ||
        COALESCE(' (Near ' || landmark || ')', '')
    ) STORED,
    
    -- Additional fields for future use
    postal_code VARCHAR(10) DEFAULT '9500',
    address_type VARCHAR(20) DEFAULT 'residential',
    is_validated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CONTACT_INFO Table (Optional - for additional contact details)
CREATE TABLE contact_info (
    contact_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Additional contact methods
    secondary_phone VARCHAR(15),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    emergency_relationship VARCHAR(50),
    
    -- Phone verification tracking
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(primary_phone);
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_users_address ON users(address_id);

CREATE INDEX idx_addresses_barangay ON addresses(barangay_name);
CREATE INDEX idx_addresses_full_text ON addresses USING GIN(to_tsvector('english', full_address));
CREATE INDEX idx_addresses_street ON addresses(street);

-- 5. Function to normalize Philippine phone numbers
CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digit characters except +
    phone_input := REGEXP_REPLACE(TRIM(phone_input), '[^0-9+]', '', 'g');
    
    -- Handle different Philippine phone formats
    IF phone_input ~ '^09[0-9]{9}$' THEN
        -- Convert 09XXXXXXXXX to +639XXXXXXXXX
        RETURN '+63' || SUBSTRING(phone_input FROM 2);
    ELSIF phone_input ~ '^\+639[0-9]{9}$' THEN
        -- Already in correct format
        RETURN phone_input;
    ELSIF phone_input ~ '^639[0-9]{9}$' THEN
        -- Add + prefix
        RETURN '+' || phone_input;
    ELSE
        -- Return original if doesn't match any pattern
        RETURN phone_input;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for easy reporting (combines normalized data)
CREATE OR REPLACE VIEW user_details AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.middle_name,
    u.last_name,
    u.full_name,
    u.primary_phone,
    u.email,
    
    -- Address information
    a.house_number,
    a.street,
    a.purok,
    a.barangay_name,
    a.city_name,
    a.landmark,
    a.full_address,
    a.postal_code,
    
    -- Additional contact info (if exists)
    ci.secondary_phone,
    ci.emergency_contact_name,
    ci.emergency_contact_phone,
    ci.phone_verified,
    
    -- Audit fields
    u.role_id,
    u.created_at,
    u.updated_at
    
FROM users u
LEFT JOIN addresses a ON u.address_id = a.address_id
LEFT JOIN contact_info ci ON u.user_id = ci.user_id;

-- 7. Migration script for existing users (if needed)
/*
-- Uncomment and run this if you have existing users to migrate:

INSERT INTO addresses (house_number, street, purok, barangay_name, city_name, landmark)
SELECT DISTINCT 
    house_number,
    COALESCE(street, 'N/A'),
    purok,
    COALESCE(barangay_name, 'Unknown'),
    COALESCE(city_name, 'General Santos City'),
    landmark
FROM users 
WHERE street IS NOT NULL OR barangay_name IS NOT NULL;

-- Update users with address_id
UPDATE users u 
SET address_id = a.address_id 
FROM addresses a 
WHERE (u.street = a.street OR (u.street IS NULL AND a.street = 'N/A'))
  AND (u.barangay_name = a.barangay_name OR (u.barangay_name IS NULL AND a.barangay_name = 'Unknown'))
  AND (u.city_name = a.city_name)
  AND (u.house_number = a.house_number OR (u.house_number IS NULL AND a.house_number IS NULL))
  AND (u.purok = a.purok OR (u.purok IS NULL AND a.purok IS NULL))
  AND (u.landmark = a.landmark OR (u.landmark IS NULL AND a.landmark IS NULL));
*/

-- 8. Sample reporting queries
/*
-- Get all users with their complete addresses
SELECT user_id, full_name, primary_phone, full_address 
FROM user_details 
ORDER BY barangay_name, street;

-- Count users by barangay
SELECT barangay_name, COUNT(*) as user_count 
FROM user_details 
GROUP BY barangay_name 
ORDER BY user_count DESC;

-- Find users by landmark
SELECT full_name, full_address 
FROM user_details 
WHERE landmark ILIKE '%SM Mall%';
*/
