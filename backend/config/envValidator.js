// Environment Variable Validator
require('dotenv').config();

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredVars = new Map();
    this.optionalVars = new Map();
  }

  // Define required environment variables
  defineRequired(varName, description, validator = null) {
    this.requiredVars.set(varName, { description, validator });
    return this;
  }

  // Define optional environment variables
  defineOptional(varName, description, defaultValue = null, validator = null) {
    this.optionalVars.set(varName, { description, defaultValue, validator });
    return this;
  }

  // Validate all defined variables
  validate() {
    console.log('🔍 Validating environment variables...\n');

    // Check required variables
    for (const [varName, config] of this.requiredVars) {
      const value = process.env[varName];
      
      if (!value) {
        this.errors.push(`❌ Missing required environment variable: ${varName}`);
        console.error(`❌ ${varName}: MISSING (${config.description})`);
      } else if (config.validator && !config.validator(value)) {
        this.errors.push(`❌ Invalid value for ${varName}: ${value}`);
        console.error(`❌ ${varName}: INVALID VALUE (${config.description})`);
      } else {
        console.log(`✅ ${varName}: ${this.maskSensitive(varName, value)}`);
      }
    }

    // Check optional variables
    for (const [varName, config] of this.optionalVars) {
      const value = process.env[varName];
      
      if (!value) {
        if (config.defaultValue) {
          console.log(`⚠️  ${varName}: Using default value (${config.description})`);
        } else {
          this.warnings.push(`⚠️ Optional variable not set: ${varName}`);
          console.warn(`⚠️  ${varName}: NOT SET (${config.description})`);
        }
      } else if (config.validator && !config.validator(value)) {
        this.warnings.push(`⚠️ Invalid value for optional ${varName}: ${value}`);
        console.warn(`⚠️  ${varName}: INVALID VALUE (${config.description})`);
      } else {
        console.log(`✅ ${varName}: ${this.maskSensitive(varName, value)}`);
      }
    }

    // Print summary
    console.log('\n📊 Environment Validation Summary:');
    console.log(`✅ Required variables: ${this.requiredVars.size - this.errors.length}/${this.requiredVars.size}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.error('\n❌ Critical environment variable errors:');
      this.errors.forEach(error => console.error(error));
      throw new Error('Environment validation failed. Please check your environment variables.');
    }

    if (this.warnings.length > 0) {
      console.warn('\n⚠️ Environment warnings:');
      this.warnings.forEach(warning => console.warn(warning));
    }

    console.log('\n✅ Environment validation completed successfully!\n');
    return true;
  }

  // Mask sensitive values in logs
  maskSensitive(varName, value) {
    const sensitivePatterns = [
      'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PRIVATE'
    ];
    
    if (sensitivePatterns.some(pattern => varName.toUpperCase().includes(pattern))) {
      return value.length > 8 ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}` : '****';
    }
    
    return value;
  }

  // Get validation report
  getReport() {
    return {
      errors: this.errors,
      warnings: this.warnings,
      requiredCount: this.requiredVars.size,
      optionalCount: this.optionalVars.size,
      isValid: this.errors.length === 0
    };
  }
}

// Validators
const validators = {
  port: (value) => {
    const port = parseInt(value);
    return !isNaN(port) && port > 0 && port <= 65535;
  },
  
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  boolean: (value) => {
    return ['true', 'false', '1', '0'].includes(value.toLowerCase());
  },
  
  nonEmpty: (value) => {
    return value && value.trim().length > 0;
  },
  
  minLength: (minLen) => (value) => {
    return value && value.length >= minLen;
  }
};

// Create and configure validator
const envValidator = new EnvValidator();

// Database Configuration
envValidator
  .defineRequired('DB_HOST', 'Database host address', validators.nonEmpty)
  .defineRequired('DB_PORT', 'Database port number', validators.port)
  .defineRequired('DB_NAME', 'Database name', validators.nonEmpty)
  .defineRequired('DB_USER', 'Database username', validators.nonEmpty)
  .defineRequired('DB_PASSWORD', 'Database password', validators.minLength(1))
  .defineOptional('DB_MAX_CONNECTIONS', 'Maximum database connections', '20', validators.port)
  .defineOptional('DB_CONNECTION_TIMEOUT', 'Database connection timeout (ms)', '30000', validators.port)
  .defineOptional('DB_IDLE_TIMEOUT', 'Database idle timeout (ms)', '10000', validators.port);

// Server Configuration
envValidator
  .defineOptional('PORT', 'Server port number', '5000', validators.port)
  .defineOptional('NODE_ENV', 'Node environment', 'development')
  .defineOptional('PUBLIC_URL', 'Public URL for the backend service');

// JWT Configuration
envValidator
  .defineRequired('JWT_SECRET', 'JWT secret key for token signing', validators.minLength(32));

// Email Configuration (SMTP)
envValidator
  .defineOptional('BREVO_SMTP_USER', 'Brevo SMTP username', null, validators.email)
  .defineOptional('BREVO_SMTP_KEY', 'Brevo SMTP API key', null, validators.minLength(10))
  .defineOptional('BREVO_SENDER_EMAIL', 'Brevo sender email address', null, validators.email);

// PayMongo Configuration
envValidator
  .defineOptional('PAYMONGO_SECRET_KEY', 'PayMongo secret key for payments', null, validators.minLength(10))
  .defineOptional('PAYMONGO_PUBLIC_KEY', 'PayMongo public key for payments', null, validators.minLength(10));

// External Service URLs
envValidator
  .defineOptional('FRONTEND_URL', 'Frontend application URL', null, validators.url)
  .defineOptional('ADMIN_SITE_URL', 'Admin site URL', null, validators.url);

// Export validator and validation function
module.exports = {
  envValidator,
  validators,
  validateEnvironment: () => envValidator.validate(),
  getValidationReport: () => envValidator.getReport()
};
