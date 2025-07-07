const pool = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.contact_number,
        u.created_at,
        n.first_name,
        n.middle_name,
        n.last_name,
        a.street,
        b.barangay_name,
        c.city_name
      FROM users u
      JOIN user_names n ON u.name_id = n.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      JOIN cities c ON a.city_id = c.city_id
      ORDER BY u.created_at DESC;
    `;

    const result = await pool.query(query);
    
    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.contact_number,
        u.created_at,
        n.first_name,
        n.middle_name,
        n.last_name,
        a.street,
        b.barangay_name,
        c.city_name
      FROM users u
      JOIN user_names n ON u.name_id = n.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      JOIN cities c ON a.city_id = c.city_id
      WHERE u.user_id = $1;
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllUsers,
  getUserDetails
}; 