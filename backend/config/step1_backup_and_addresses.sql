-- =====================================================
-- BACKUP AND MIGRATION SCRIPT
-- Step-by-step implementation for your WSBS database
-- Date: August 11, 2025
-- =====================================================

-- STEP 1: Create backup of current users table
CREATE TABLE users_backup_20250811 AS SELECT * FROM users;

-- Verify backup was created
SELECT 
    COUNT(*) as total_users,
    COUNT(street) as users_with_street,
    COUNT(barangay_name) as users_with_barangay,
    COUNT(full_name) as users_with_full_name
FROM users_backup_20250811;

-- STEP 2: Create normalized ADDRESSES table
CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    
    -- Address components matching your WSBS registration form
    house_number VARCHAR(20),           -- "e.g., 123, Block 5, Lot 10"
    street VARCHAR(200) NOT NULL,       -- "e.g., Maharlika Street"
    purok VARCHAR(100),                 -- "e.g., Purok Maligaya"
    barangay_name VARCHAR(100) NOT NULL, -- From your barangay dropdown
    city_name VARCHAR(100) NOT NULL DEFAULT 'General Santos City',
    landmark VARCHAR(200),              -- "e.g., Near SM Mall"
    
    -- Auto-generated full address for reporting
    full_address TEXT GENERATED ALWAYS AS (
        COALESCE(house_number || ', ', '') ||
        street || ', ' ||
        COALESCE(purok || ', ', '') ||
        barangay_name || ', ' ||
        city_name ||
        COALESCE(' (Near ' || landmark || ')', '')
    ) STORED,
    
    -- Additional fields
    postal_code VARCHAR(10) DEFAULT '9500',
    address_type VARCHAR(20) DEFAULT 'residential',
    is_validated BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STEP 3: Create performance indexes for addresses
CREATE INDEX idx_addresses_barangay ON addresses(barangay_name);
CREATE INDEX idx_addresses_street ON addresses(street);
CREATE INDEX idx_addresses_city ON addresses(city_name);

-- STEP 4: Insert unique addresses from current users table
INSERT INTO addresses (house_number, street, purok, barangay_name, city_name, landmark)
SELECT DISTINCT 
    NULLIF(TRIM(house_number), ''),     -- Convert empty strings to NULL
    COALESCE(NULLIF(TRIM(street), ''), 'Unknown Street'),  -- Handle missing street
    NULLIF(TRIM(purok), ''),
    COALESCE(NULLIF(TRIM(barangay_name), ''), 'Unknown Barangay'), -- Handle missing barangay
    COALESCE(NULLIF(TRIM(city_name), ''), 'General Santos City'),
    NULLIF(TRIM(landmark), '')
FROM users 
WHERE TRIM(COALESCE(street, '')) != '' 
   OR TRIM(COALESCE(barangay_name, '')) != '' 
   OR TRIM(COALESCE(house_number, '')) != ''
   OR TRIM(COALESCE(purok, '')) != ''
   OR TRIM(COALESCE(landmark, '')) != '';

-- Verify addresses were inserted
SELECT 
    COUNT(*) as total_addresses,
    COUNT(DISTINCT barangay_name) as unique_barangays
FROM addresses;

-- Show sample addresses
SELECT * FROM addresses ORDER BY address_id LIMIT 5;

COMMIT;
