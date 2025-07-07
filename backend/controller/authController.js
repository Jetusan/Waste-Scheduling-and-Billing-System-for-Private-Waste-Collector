const bcrypt = require('bcrypt');
const { createUser } = require('../models/userModel');

const registerUser = async (req, res) => {
  try {
    const { 
      firstName, middleName, lastName, 
      username, contactNumber, password, 
      confirmPassword, city, barangay, street 
    } = req.body;

    // Validate required fields
    if (!firstName?.trim()) {
      return res.status(400).json({ message: 'First name is required' });
    }
    if (!lastName?.trim()) {
      return res.status(400).json({ message: 'Last name is required' });
    }
    if (!username?.trim()) {
      return res.status(400).json({ message: 'Username is required' });
    }
    if (!contactNumber?.trim()) {
      return res.status(400).json({ message: 'Contact number is required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (!confirmPassword) {
      return res.status(400).json({ message: 'Please confirm your password' });
    }
    if (!barangay?.trim()) {
      return res.status(400).json({ message: 'Barangay is required' });
    }
    if (!street?.trim()) {
      return res.status(400).json({ message: 'Street address is required' });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Hash the password before saving
    console.log('Password before hashing:', password);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password after hashing:', hashedPassword);

    // Create user and save to database
    const newUserId = await createUser({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || null,
      lastName: lastName.trim(),
      username: username.trim(),
      contactNumber: contactNumber.trim(),
      password: hashedPassword, // Pass hashed password
      city: city || 'General Santos City',
      barangay: barangay.trim(),
      street: street.trim()
    });

    // Log registration success in the terminal
    console.log(`✅ User '${username}' registered successfully`);
    // Send success response
    res.status(201).json({ 
      success: true,
      message: 'Registration successful!',
      userId: newUserId 
    });

  } catch (err) {
    console.error('Registration error:', err);

    // Handle specific database errors
    if (err.code === '23505' && err.constraint === 'users_username_key') {
      return res.status(400).json({ 
        message: 'Username already exists. Please choose a different username.' 
      });
    }

    // Handle other specific errors
    if (err.message === 'Barangay not found') {
      return res.status(400).json({ 
        message: 'Selected barangay is not valid for General Santos City.' 
      });
    }

    if (err.message === 'City not found') {
      return res.status(400).json({ 
        message: 'City not found in the database.' 
      });
    }

    // Generic error response
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = { registerUser };
