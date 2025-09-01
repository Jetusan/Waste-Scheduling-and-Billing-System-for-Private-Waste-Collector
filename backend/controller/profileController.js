const pool = require('../config/dbAdmin');

const getOwnProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 Fetching profile for user ID:', userId);
    
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.contact_number,
        u.email,
        u.created_at,
        un.first_name,
        un.middle_name,
        un.last_name,
        CONCAT(un.first_name, ' ', COALESCE(un.middle_name, ''), ' ', un.last_name) as full_name,
        a.full_address,
        a.street,
        a.block,
        a.lot,
        b.barangay_name,
        a.city_municipality as city_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.user_id = $1;
    `;
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found for ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    console.log('✅ Profile found:', {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      barangay_name: user.barangay_name
    });

    // Clean up the full_name by removing extra spaces
    const cleanFullName = user.full_name ? user.full_name.replace(/\s+/g, ' ').trim() : null;

    res.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        phone: user.contact_number,  // Changed from contact_number to phone to match frontend
        email: user.email,
        
        // Name fields - both formats for compatibility
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        first_name: user.first_name,  // Backward compatibility
        middle_name: user.middle_name, // Backward compatibility
        last_name: user.last_name,    // Backward compatibility
        name: cleanFullName,
        
        // Address fields - both formats for compatibility
        address: {
          street: user.street,
          barangay: user.barangay_name,
          city: user.city_name,
          block: user.block,
          lot: user.lot,
          fullAddress: user.full_address,
          subdivision: user.subdivision
        },
        
        // Backward compatibility - direct fields
        barangay: user.barangay_name,
        barangay_name: user.barangay_name,
        street: user.street,
        city_name: user.city_name,
        block: user.block,
        lot: user.lot,
        full_address: user.full_address,
        
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { getOwnProfile }; 