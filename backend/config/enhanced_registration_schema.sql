-- =====================================================
-- ENHANCED DATABASE SCHEMA FOR WSBS REGISTRATION
-- This will fix address and phone number issues for reporting
-- =====================================================

-- 1. Create enhanced address table (optimized for reporting)
CREATE TABLE IF NOT EXISTS enhanced_addresses (
    address_id SERIAL PRIMARY KEY,
    
    -- Complete address in one field for fast reporting
    full_address TEXT GENERATED ALWAYS AS (
        COALESCE(house_number || ' ', '') ||
        COALESCE(street || ', ', '') ||
        COALESCE(purok || ', ', '') ||
        barangay_name || ', ' ||
        city_name || ', ' ||
        COALESCE(postal_code, '9500')
    ) STORED,
    
    -- Structured address components
    house_number VARCHAR(20),
    street VARCHAR(200) NOT NULL,
    purok VARCHAR(100),          -- Subdivision/Purok
    barangay_name VARCHAR(100) NOT NULL,
    city_name VARCHAR(100) NOT NULL DEFAULT 'General Santos City',
    postal_code VARCHAR(10) DEFAULT '9500',
    
    -- Geographic coordinates (for future mapping)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Address validation flags
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP,
    
    -- For reporting categories
    address_type VARCHAR(50) DEFAULT 'residential',
    landmark TEXT,
    delivery_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create normalized contact information table
CREATE TABLE IF NOT EXISTS contact_info (
    contact_id SERIAL PRIMARY KEY,
    
    -- Normalized phone numbers (always +639XXXXXXXXX format)
    primary_phone VARCHAR(15) NOT NULL,
    secondary_phone VARCHAR(15),
    email VARCHAR(100),
    
    -- Phone verification tracking
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verification_code VARCHAR(6),
    phone_verified_at TIMESTAMP,
    
    -- Emergency contact info
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    emergency_relationship VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create enhanced user registrations table
CREATE TABLE IF NOT EXISTS user_registrations (
    registration_id SERIAL PRIMARY KEY,
    
    -- Personal information
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    
    -- Full name computed field for fast reporting
    full_name TEXT GENERATED ALWAYS AS (
        first_name || 
        COALESCE(' ' || middle_name, '') || 
        ' ' || last_name
    ) STORED,
    
    -- Account credentials
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Foreign key references
    address_id INTEGER REFERENCES enhanced_addresses(address_id),
    contact_id INTEGER REFERENCES contact_info(contact_id),
    role_id INTEGER REFERENCES roles(role_id) DEFAULT 1,
    
    -- Registration tracking
    registration_date DATE DEFAULT CURRENT_DATE,
    registration_status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    
    -- For reporting and analytics
    customer_segment VARCHAR(30) DEFAULT 'standard',
    acquisition_source VARCHAR(50) DEFAULT 'mobile_app',
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for fast reporting
CREATE INDEX IF NOT EXISTS idx_enhanced_addresses_barangay ON enhanced_addresses(barangay_name);
CREATE INDEX IF NOT EXISTS idx_enhanced_addresses_full_text ON enhanced_addresses USING GIN(to_tsvector('english', full_address));
CREATE INDEX IF NOT EXISTS idx_contact_info_phone ON contact_info(primary_phone);
CREATE INDEX IF NOT EXISTS idx_user_registrations_username ON user_registrations(username);
CREATE INDEX IF NOT EXISTS idx_user_registrations_role ON user_registrations(role_id);
CREATE INDEX IF NOT EXISTS idx_user_registrations_date ON user_registrations(registration_date);
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON user_registrations(registration_status);

-- 5. Phone number validation function
CREATE OR REPLACE FUNCTION validate_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digit characters
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

-- 6. Create reporting view for fast queries
CREATE OR REPLACE VIEW user_registration_report AS
SELECT 
    ur.registration_id,
    ur.full_name,
    ur.username,
    ur.first_name,
    ur.last_name,
    
    -- Complete address information
    ea.full_address,
    ea.house_number,
    ea.street,
    ea.purok,
    ea.barangay_name,
    ea.city_name,
    ea.landmark,
    
    -- Contact information
    ci.primary_phone,
    ci.email,
    ci.phone_verified,
    
    -- Registration details
    ur.registration_date,
    ur.registration_status,
    ur.customer_segment,
    ur.acquisition_source,
    ur.last_login,
    
    -- Role information
    r.role_name,
    
    -- Geographic data
    ea.latitude,
    ea.longitude,
    
    -- Timestamps
    ur.created_at,
    ur.updated_at
    
FROM user_registrations ur
LEFT JOIN enhanced_addresses ea ON ur.address_id = ea.address_id
LEFT JOIN contact_info ci ON ur.contact_id = ci.contact_id
LEFT JOIN roles r ON ur.role_id = r.role_id;

-- 7. Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_enhanced_addresses_updated_at
    BEFORE UPDATE ON enhanced_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_info_updated_at
    BEFORE UPDATE ON contact_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_registrations_updated_at
    BEFORE UPDATE ON user_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Sample quick reporting queries
/*
-- Registration summary by barangay (super fast)
SELECT 
    barangay_name,
    COUNT(*) as total_registrations,
    COUNT(CASE WHEN phone_verified THEN 1 END) as verified_phones,
    COUNT(CASE WHEN registration_status = 'active' THEN 1 END) as active_users
FROM user_registration_report 
GROUP BY barangay_name
ORDER BY total_registrations DESC;

-- Address completeness report
SELECT 
    barangay_name,
    COUNT(*) as total_users,
    COUNT(CASE WHEN house_number IS NOT NULL THEN 1 END) as with_house_number,
    COUNT(CASE WHEN purok IS NOT NULL THEN 1 END) as with_purok,
    COUNT(CASE WHEN landmark IS NOT NULL THEN 1 END) as with_landmark
FROM user_registration_report
GROUP BY barangay_name;

-- Phone number validation report
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN primary_phone ~ '^\+639[0-9]{9}$' THEN 1 END) as valid_format,
    COUNT(CASE WHEN phone_verified THEN 1 END) as verified_phones
FROM user_registration_report;
*/

COMMIT;
