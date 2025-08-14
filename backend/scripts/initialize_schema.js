const { pool } = require('../config/db');

const createSchema = async () => {
  const client = await pool.connect();
  console.log('🚀 Starting database schema initialization...');

  try {
    await client.query('BEGIN');

    // 1. Roles Table
    console.log('Creating roles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ roles table created or already exists.');

    // 2. Contact Info Table
    console.log('Creating contact_info table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_info (
        contact_id SERIAL PRIMARY KEY,
        primary_phone VARCHAR(20) UNIQUE,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ contact_info table created or already exists.');

    // 3. Enhanced Addresses Table
    console.log('Creating enhanced_addresses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS enhanced_addresses (
        address_id SERIAL PRIMARY KEY,
        house_number VARCHAR(255),
        street VARCHAR(255) NOT NULL,
        purok VARCHAR(255),
        barangay_name VARCHAR(255) NOT NULL,
        city_name VARCHAR(255) NOT NULL,
        province_name VARCHAR(255) DEFAULT 'South Cotabato',
        country_name VARCHAR(255) DEFAULT 'Philippines',
        postal_code VARCHAR(10) DEFAULT '9500',
        address_type VARCHAR(50) NOT NULL,
        full_address TEXT GENERATED ALWAYS AS (
          TRIM(CONCAT(house_number, ' ', street, ' ', purok, ', ', barangay_name, ', ', city_name, ', ', province_name, ' ', postal_code))
        ) STORED,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ enhanced_addresses table created or already exists.');

    // 4. User Registrations Table
    console.log('Creating user_registrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_registrations (
        registration_id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        full_name TEXT GENERATED ALWAYS AS (
            TRIM(CONCAT(first_name, ' ', middle_name, ' ', last_name))
        ) STORED,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        address_id INT REFERENCES enhanced_addresses(address_id),
        contact_id INT REFERENCES contact_info(contact_id),
        role_id INT REFERENCES roles(role_id),
        registration_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMPTZ,
        last_password_reset TIMESTAMPTZ,
        registration_status VARCHAR(50) DEFAULT 'active',
        customer_segment VARCHAR(50),
        acquisition_source VARCHAR(100)
      );
    `);
    console.log('✅ user_registrations table created or already exists.');
    
    // 5. Password Reset Tokens Table
    console.log('Creating password_reset_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user_registrations(registration_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ password_reset_tokens table created or already exists.');

    // Insert default roles if they don't exist
    console.log('Inserting default roles...');
    await client.query(`
      INSERT INTO roles (role_name, description) VALUES
      ('resident', 'A standard user of the waste management service.'),
      ('collector', 'A staff member responsible for collecting waste.'),
      ('admin', 'An administrator with full system access.')
      ON CONFLICT (role_name) DO NOTHING;
    `);
    console.log('✅ Default roles inserted or already exist.');

    await client.query('COMMIT');
    console.log('🎉 Database schema initialization completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

createSchema().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
