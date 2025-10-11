const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function fixPasswordResetTable() {
  try {
    console.log('🔧 Connecting to Neon database to fix password_reset_tokens table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'password_reset_tokens'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('📋 Creating password_reset_tokens table...');
      
      // Create the complete table with all required columns
      await pool.query(`
        CREATE TABLE password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ password_reset_tokens table created successfully!');
      
    } else {
      console.log('✅ password_reset_tokens table exists, checking columns...');
      
      // Check if email column exists
      const emailColumnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_tokens'
        AND column_name = 'email'
      `);
      
      if (emailColumnCheck.rows.length === 0) {
        console.log('➕ Adding missing email column...');
        
        await pool.query(`
          ALTER TABLE password_reset_tokens 
          ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT ''
        `);
        
        console.log('✅ Email column added successfully!');
      } else {
        console.log('✅ Email column already exists');
      }
      
      // Check other missing columns and add them if needed
      const requiredColumns = [
        { name: 'ip_address', type: 'INET' },
        { name: 'user_agent', type: 'TEXT' },
        { name: 'used', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
      ];
      
      for (const column of requiredColumns) {
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'password_reset_tokens'
          AND column_name = $1
        `, [column.name]);
        
        if (columnCheck.rows.length === 0) {
          console.log(`➕ Adding missing ${column.name} column...`);
          
          await pool.query(`
            ALTER TABLE password_reset_tokens 
            ADD COLUMN ${column.name} ${column.type}
          `);
          
          console.log(`✅ ${column.name} column added successfully!`);
        }
      }
    }
    
    // Show final table structure
    console.log('\n📋 Final table structure:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'password_reset_tokens'
      ORDER BY ordinal_position
    `);
    
    finalColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n🎉 Password reset table is now properly configured!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

fixPasswordResetTable();
