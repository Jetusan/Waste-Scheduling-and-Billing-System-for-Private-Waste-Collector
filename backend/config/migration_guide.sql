-- =====================================================
-- STEP-BY-STEP IMPLEMENTATION GUIDE
-- How to migrate your current USERS table to normalized structure
-- =====================================================

-- STEP 1: Backup your current data
-- Run this in your PostgreSQL before making changes:
/*
CREATE TABLE users_backup_$(date +%Y%m%d) AS SELECT * FROM users;
*/

-- STEP 2: Create the new ADDRESSES table
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

-- STEP 3: Create indexes for performance
CREATE INDEX idx_addresses_barangay ON addresses(barangay_name);
CREATE INDEX idx_addresses_street ON addresses(street);
CREATE INDEX idx_addresses_full_text ON addresses USING GIN(to_tsvector('english', full_address));

-- STEP 4: Insert unique addresses from your current users table
INSERT INTO addresses (house_number, street, purok, barangay_name, city_name, landmark)
SELECT DISTINCT 
    NULLIF(TRIM(house_number), ''),     -- Convert empty strings to NULL
    COALESCE(NULLIF(TRIM(street), ''), 'Unknown Street'),  -- Handle missing street
    NULLIF(TRIM(purok), ''),
    COALESCE(NULLIF(TRIM(barangay_name), ''), 'Unknown Barangay'), -- Handle missing barangay
    COALESCE(NULLIF(TRIM(city_name), ''), 'General Santos City'),
    NULLIF(TRIM(landmark), '')
FROM users 
WHERE street IS NOT NULL 
   OR barangay_name IS NOT NULL 
   OR house_number IS NOT NULL
   OR purok IS NOT NULL
   OR landmark IS NOT NULL;

-- STEP 5: Add address_id column to users table
ALTER TABLE users ADD COLUMN address_id INTEGER;
ALTER TABLE users ADD CONSTRAINT fk_users_address 
    FOREIGN KEY (address_id) REFERENCES addresses(address_id);

-- STEP 6: Update users with their corresponding address_id
UPDATE users u 
SET address_id = a.address_id 
FROM addresses a 
WHERE (
    -- Match all address components
    (u.street = a.street OR (u.street IS NULL AND a.street = 'Unknown Street')) AND
    (u.barangay_name = a.barangay_name OR (u.barangay_name IS NULL AND a.barangay_name = 'Unknown Barangay')) AND
    (u.city_name = a.city_name OR (u.city_name IS NULL AND a.city_name = 'General Santos City')) AND
    (u.house_number = a.house_number OR (u.house_number IS NULL AND a.house_number IS NULL)) AND
    (u.purok = a.purok OR (u.purok IS NULL AND a.purok IS NULL)) AND
    (u.landmark = a.landmark OR (u.landmark IS NULL AND a.landmark IS NULL))
);

-- STEP 7: Add computed full_name column to users table
ALTER TABLE users ADD COLUMN full_name_computed TEXT 
GENERATED ALWAYS AS (
    first_name || 
    COALESCE(' ' || NULLIF(TRIM(middle_name), '') || ' ', ' ') || 
    last_name
) STORED;

-- STEP 8: Normalize phone numbers in users table
-- Update existing phone numbers to +639XXXXXXXXX format
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Handle NULL or empty input
    IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
        RETURN phone_input;
    END IF;
    
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

-- Update all existing phone numbers
UPDATE users 
SET primary_phone = normalize_phone_number(primary_phone)
WHERE primary_phone IS NOT NULL;

UPDATE users 
SET contact_number = normalize_phone_number(contact_number)
WHERE contact_number IS NOT NULL;

-- STEP 9: Create reporting view that combines everything
CREATE OR REPLACE VIEW user_details AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.middle_name,
    u.last_name,
    
    -- Use computed full name if available, otherwise build it
    COALESCE(u.full_name_computed, u.full_name, 
        u.first_name || COALESCE(' ' || NULLIF(u.middle_name, '') || ' ', ' ') || u.last_name
    ) as full_name,
    
    -- Use normalized phone numbers
    COALESCE(u.primary_phone, u.contact_number) as primary_phone,
    u.email,
    
    -- Address information from addresses table
    a.house_number,
    a.street,
    a.purok,
    a.barangay_name,
    a.city_name,
    a.landmark,
    a.full_address,
    
    -- Role and timestamps
    u.role_id,
    u.created_at,
    u.updated_at
    
FROM users u
LEFT JOIN addresses a ON u.address_id = a.address_id;

-- STEP 10: Add performance indexes to users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(primary_phone);
CREATE INDEX IF NOT EXISTS idx_users_contact ON users(contact_number);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name_computed);
CREATE INDEX IF NOT EXISTS idx_users_address ON users(address_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- STEP 11: Verify migration results
-- Check total users migrated
SELECT 
    COUNT(*) as total_users,
    COUNT(address_id) as users_with_address,
    COUNT(*) - COUNT(address_id) as users_without_address
FROM users;

-- Check address distribution
SELECT 
    a.barangay_name,
    COUNT(u.user_id) as user_count
FROM addresses a
LEFT JOIN users u ON a.address_id = u.address_id
GROUP BY a.barangay_name
ORDER BY user_count DESC;

-- Check sample full addresses
SELECT 
    user_id,
    username,
    full_name,
    full_address,
    primary_phone
FROM user_details 
LIMIT 10;

-- STEP 12: (Optional) Clean up old columns after verification
-- WARNING: Only run this after thoroughly testing the new structure!
/*
-- Remove old address columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS street;
ALTER TABLE users DROP COLUMN IF EXISTS house_number;
ALTER TABLE users DROP COLUMN IF EXISTS barangay_name;
ALTER TABLE users DROP COLUMN IF EXISTS city_name;
ALTER TABLE users DROP COLUMN IF EXISTS full_address;
ALTER TABLE users DROP COLUMN IF EXISTS purok;
ALTER TABLE users DROP COLUMN IF EXISTS landmark;

-- Remove old full_name column if using computed version
ALTER TABLE users DROP COLUMN IF EXISTS full_name;
-- Rename computed column to full_name
ALTER TABLE users RENAME COLUMN full_name_computed TO full_name;
*/

-- =====================================================
-- TESTING QUERIES - Run these to verify everything works
-- =====================================================

-- Test 1: Basic user lookup with address
SELECT * FROM user_details WHERE username = 'testuser123';

-- Test 2: Users by barangay (for reporting)
SELECT barangay_name, COUNT(*) as user_count 
FROM user_details 
GROUP BY barangay_name 
ORDER BY user_count DESC;

-- Test 3: Search users by landmark
SELECT full_name, full_address 
FROM user_details 
WHERE full_address ILIKE '%mall%' 
OR landmark ILIKE '%mall%';

-- Test 4: Phone number format consistency
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN primary_phone ~ '^\+639[0-9]{9}$' THEN 1 END) as normalized_phones,
    COUNT(CASE WHEN primary_phone IS NOT NULL AND primary_phone !~ '^\+639[0-9]{9}$' THEN 1 END) as non_standard_phones
FROM user_details;

-- Test 5: Performance test for reporting
EXPLAIN ANALYZE 
SELECT barangay_name, COUNT(*) 
FROM user_details 
GROUP BY barangay_name;

-- =====================================================
-- SUCCESS CRITERIA - All these should return expected results:
-- =====================================================
/*
✅ Total users count should match your original users table
✅ All users should have address_id (unless they had no address data)
✅ Full addresses should be properly formatted
✅ Phone numbers should be in +639XXXXXXXXX format
✅ Reporting queries should be fast (<100ms for your 46 users)
✅ No data should be lost during migration
*/
