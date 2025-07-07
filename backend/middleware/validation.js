const validateRegistration = (req, res, next) => {
  const {
    firstName, middleName, lastName, username,
    contactNumber, password, city, barangay, street
  } = req.body;

  const errors = [];

  // Required fields
  if (!firstName?.trim()) errors.push('First name is required');
  if (!lastName?.trim()) errors.push('Last name is required');
  if (!username?.trim()) errors.push('Username is required');
  if (!contactNumber?.trim()) errors.push('Contact number is required');
  if (!password?.trim()) errors.push('Password is required');
  if (!city?.trim()) errors.push('City is required');
  if (!barangay?.trim()) errors.push('Barangay is required');
  if (!street?.trim()) errors.push('Street address is required');

  // Validation rules
  if (username?.length < 4) {
    errors.push('Username must be at least 4 characters long');
  }

  if (password?.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (contactNumber && !/^\+?[\d\s-]{10,}$/.test(contactNumber)) {
    errors.push('Invalid contact number format');
  }

  // Name validations
  if (firstName && !/^[A-Za-z\s]{2,}$/.test(firstName)) {
    errors.push('First name must contain only letters and be at least 2 characters long');
  }

  if (middleName && !/^[A-Za-z\s]{1,}$/.test(middleName)) {
    errors.push('Middle name must contain only letters');
  }

  if (lastName && !/^[A-Za-z\s]{2,}$/.test(lastName)) {
    errors.push('Last name must contain only letters and be at least 2 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateRegistration
}; 