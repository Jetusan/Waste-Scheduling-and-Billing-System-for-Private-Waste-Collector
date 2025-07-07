const express = require('express');
const { registerUser } = require('../controller/authController');
const { loginUser } = require('../controller/loginController');
const { getAllUsers, getUserDetails } = require('../controller/adminController');
const { validateRegistration } = require('../middleware/validation');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const router = express.Router();

// Registration route with validation
router.post('/register', validateRegistration, registerUser);

// Login route
router.post('/login', loginUser);

// Admin routes (protected)
router.get('/admin/users', authenticateJWT, authorizeRoles('admin'), getAllUsers);
router.get('/admin/users/:userId', authenticateJWT, authorizeRoles('admin'), getUserDetails);

module.exports = router;
