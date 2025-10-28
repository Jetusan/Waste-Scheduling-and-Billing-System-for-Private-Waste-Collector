/**
 * API Data Validation Middleware
 * 
 * This middleware provides comprehensive validation for all API endpoints
 * to ensure data integrity and prevent crashes from invalid input.
 */

const Joi = require('joi');

/**
 * Common validation schemas
 */
const commonSchemas = {
  // User ID validation
  userId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    }),

  // Email validation
  email: Joi.string().email().max(255)
    .messages({
      'string.email': 'Must be a valid email address',
      'string.max': 'Email must not exceed 255 characters'
    }),

  // Phone number validation (Philippine format)
  phoneNumber: Joi.string().pattern(/^(\+63|0)?[0-9]{10}$/)
    .messages({
      'string.pattern.base': 'Must be a valid Philippine phone number'
    }),

  // Date validation
  date: Joi.date().iso()
    .messages({
      'date.base': 'Must be a valid date',
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)'
    }),

  // Future date validation
  futureDate: Joi.date().iso().min('now')
    .messages({
      'date.min': 'Date must be in the future'
    }),

  // Amount validation (for payments)
  amount: Joi.number().positive().precision(2).max(999999.99)
    .messages({
      'number.positive': 'Amount must be positive',
      'number.precision': 'Amount can have at most 2 decimal places',
      'number.max': 'Amount cannot exceed ₱999,999.99'
    }),

  // Status validation
  status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'missed')
    .messages({
      'any.only': 'Status must be one of: pending, assigned, in_progress, completed, cancelled, missed'
    })
};

/**
 * Special Pickup Request Validation Schema
 */
const specialPickupRequestSchema = Joi.object({
  user_id: commonSchemas.userId.optional(), // Will be set from JWT token
  waste_type: Joi.string().min(1).max(500).required()
    .messages({
      'string.min': 'Waste type cannot be empty',
      'string.max': 'Waste type must not exceed 500 characters',
      'any.required': 'Waste type is required'
    }),
  description: Joi.string().min(1).max(1000).optional().allow('')
    .messages({
      'string.min': 'Description cannot be empty',
      'string.max': 'Description must not exceed 1000 characters'
    }),
  pickup_date: commonSchemas.futureDate.required()
    .messages({
      'any.required': 'Pickup date is required'
    }),
  address: Joi.string().min(10).max(500).required()
    .messages({
      'string.min': 'Address must be at least 10 characters',
      'string.max': 'Address must not exceed 500 characters',
      'any.required': 'Address is required'
    }),
  bag_quantity: Joi.number().integer().min(1).max(50).default(1)
    .messages({
      'number.min': 'Bag quantity must be at least 1',
      'number.max': 'Bag quantity cannot exceed 50 bags',
      'number.integer': 'Bag quantity must be a whole number'
    }),
  notes: Joi.string().max(1000).optional().allow('')
    .messages({
      'string.max': 'Notes must not exceed 1000 characters'
    }),
  message: Joi.string().max(500).optional().allow('')
    .messages({
      'string.max': 'Message must not exceed 500 characters'
    }),
  pickup_latitude: Joi.number().min(-90).max(90).optional()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90'
    }),
  pickup_longitude: Joi.number().min(-180).max(180).optional()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180'
    })
});

/**
 * Subscription Creation Validation Schema
 */
const subscriptionCreationSchema = Joi.object({
  payment_method: Joi.string().valid('manual_gcash', 'gcash', 'cash').required()
    .messages({
      'any.only': 'Payment method must be one of: manual_gcash, gcash, cash',
      'any.required': 'Payment method is required'
    }),
  plan_id: Joi.number().integer().positive().optional()
    .messages({
      'number.positive': 'Plan ID must be positive'
    })
});

/**
 * Payment Validation Schema
 */
const paymentSchema = Joi.object({
  user_id: commonSchemas.userId,
  amount: commonSchemas.amount.required(),
  payment_method: Joi.string().valid('cash', 'gcash', 'manual_gcash', 'bank_transfer', 'check').required()
    .messages({
      'any.only': 'Payment method must be one of: cash, gcash, manual_gcash, bank_transfer, check'
    }),
  payment_date: commonSchemas.date.required(),
  reference_number: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Reference number must not exceed 100 characters'
    }),
  notes: Joi.string().max(500).optional().allow('')
});

/**
 * User Registration Validation Schema
 */
const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required()
    .messages({
      'string.alphanum': 'Username must contain only letters and numbers',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 30 characters'
    }),
  email: commonSchemas.email.required(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
  full_name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name must not exceed 100 characters'
    }),
  phone_number: commonSchemas.phoneNumber.required(),
  address: Joi.string().min(10).max(500).required(),
  barangay: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Barangay must be at least 2 characters',
      'string.max': 'Barangay must not exceed 100 characters'
    }),
  subdivision: Joi.string().max(100).optional().allow('')
});

/**
 * Creates a validation middleware for a specific schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Where to get data from ('body', 'params', 'query')
 * @returns {Function} - Express middleware function
 */
const createValidationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert strings to numbers where appropriate
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        message: 'The request contains invalid data',
        details: validationErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validates file uploads
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateFileUpload = (options = {}) => {
  const {
    required = false,
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
    maxSize = 5 * 1024 * 1024, // 5MB default
    fieldName = 'image'
  } = options;

  return (req, res, next) => {
    const file = req.file;

    if (required && !file) {
      return res.status(400).json({
        error: 'File upload required',
        message: `${fieldName} file is required`
      });
    }

    if (file) {
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: `Only ${allowedTypes.join(', ')} files are allowed`,
          received: file.mimetype
        });
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
          received: `${Math.round(file.size / 1024 / 1024)}MB`
        });
      }
    }

    next();
  };
};

/**
 * Validates business rules (custom validation logic)
 */
const validateBusinessRules = {
  // Validate special pickup date is not on collection days
  specialPickupDate: (req, res, next) => {
    const { pickup_date } = req.body;
    
    if (pickup_date) {
      const date = new Date(pickup_date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 3 = Wednesday, 4 = Thursday, 5 = Friday
      
      // Check if it's a collection day (Wed, Thu, Fri)
      if ([3, 4, 5].includes(dayOfWeek)) {
        return res.status(400).json({
          error: 'Invalid pickup date',
          message: 'Special pickups cannot be scheduled on regular collection days (Wednesday, Thursday, Friday)',
          suggestedDays: 'Please choose Monday, Tuesday, Saturday, or Sunday'
        });
      }
    }
    
    next();
  },

  // Validate subscription doesn't already exist
  subscriptionExists: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      // This would need to check the database
      // const existingSubscription = await checkExistingSubscription(userId);
      // if (existingSubscription && existingSubscription.status === 'active') {
      //   return res.status(409).json({
      //     error: 'Subscription already exists',
      //     message: 'You already have an active subscription'
      //   });
      // }
      next();
    } catch (error) {
      next(error);
    }
  }
};

/**
 * Pre-built validation middleware for common endpoints
 */
const validators = {
  specialPickupRequest: [
    createValidationMiddleware(specialPickupRequestSchema),
    validateFileUpload({ required: false }),
    validateBusinessRules.specialPickupDate
  ],
  
  subscriptionCreation: [
    createValidationMiddleware(subscriptionCreationSchema),
    validateBusinessRules.subscriptionExists
  ],
  
  payment: [
    createValidationMiddleware(paymentSchema)
  ],
  
  userRegistration: [
    createValidationMiddleware(userRegistrationSchema)
  ],
  
  // Parameter validation
  userId: createValidationMiddleware(
    Joi.object({ user_id: commonSchemas.userId }), 
    'params'
  ),
  
  // Query parameter validation
  pagination: createValidationMiddleware(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    }),
    'query'
  )
};

module.exports = {
  createValidationMiddleware,
  validateFileUpload,
  validateBusinessRules,
  validators,
  schemas: {
    specialPickupRequest: specialPickupRequestSchema,
    subscriptionCreation: subscriptionCreationSchema,
    payment: paymentSchema,
    userRegistration: userRegistrationSchema
  }
};

// Example usage in routes:
/*
const { validators } = require('./middleware/validationMiddleware');

// Special pickup creation with full validation
router.post('/special-pickup', 
  authenticateJWT,
  ...validators.specialPickupRequest,
  specialPickupController.createRequest
);

// Subscription creation with validation
router.post('/subscription',
  authenticateJWT,
  ...validators.subscriptionCreation,
  billingController.createMobileSubscription
);

// User registration with validation
router.post('/register',
  ...validators.userRegistration,
  authController.register
);
*/
