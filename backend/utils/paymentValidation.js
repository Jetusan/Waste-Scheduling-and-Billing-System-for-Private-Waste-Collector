// Payment Configuration Validation Utility
const validatePaymentConfiguration = () => {
  console.log('🔍 Validating payment configuration...');
  
  const errors = [];
  const warnings = [];
  
  // PayMongo Configuration Validation
  if (!process.env.PAYMONGO_SECRET_KEY) {
    errors.push('PAYMONGO_SECRET_KEY is required for payment processing');
  } else if (!process.env.PAYMONGO_SECRET_KEY.startsWith('sk_')) {
    warnings.push('PAYMONGO_SECRET_KEY should start with "sk_"');
  }
  
  if (!process.env.PAYMONGO_PUBLIC_KEY) {
    warnings.push('PAYMONGO_PUBLIC_KEY is recommended for frontend integration');
  } else if (!process.env.PAYMONGO_PUBLIC_KEY.startsWith('pk_')) {
    warnings.push('PAYMONGO_PUBLIC_KEY should start with "pk_"');
  }
  
  // GCash Configuration Validation
  if (!process.env.GCASH_NUMBER) {
    errors.push('GCASH_NUMBER is required for GCash deep link integration');
  } else {
    const gcashNumber = process.env.GCASH_NUMBER.replace(/\D/g, ''); // Remove non-digits
    if (gcashNumber.length !== 11 || !gcashNumber.startsWith('09')) {
      warnings.push('GCASH_NUMBER should be a valid Philippine mobile number (09XXXXXXXXX)');
    }
  }
  
  if (!process.env.GCASH_MERCHANT_NAME) {
    warnings.push('GCASH_MERCHANT_NAME is recommended for better user experience');
  }
  
  if (!process.env.GCASH_ACCOUNT_NAME) {
    warnings.push('GCASH_ACCOUNT_NAME is recommended for payment verification');
  }
  
  // URL Configuration Validation
  if (!process.env.PUBLIC_URL) {
    warnings.push('PUBLIC_URL is recommended for payment redirects');
  } else {
    try {
      new URL(process.env.PUBLIC_URL);
    } catch (urlError) {
      errors.push('PUBLIC_URL must be a valid URL');
    }
  }
  
  // Demo Mode Validation
  if (process.env.DEMO_MODE && !['true', 'false'].includes(process.env.DEMO_MODE.toLowerCase())) {
    warnings.push('DEMO_MODE should be "true" or "false"');
  }
  
  // PayMongo Mode Validation
  if (process.env.PAYMONGO_MODE && !['test', 'live'].includes(process.env.PAYMONGO_MODE.toLowerCase())) {
    warnings.push('PAYMONGO_MODE should be "test" or "live"');
  }
  
  // Log results
  if (errors.length > 0) {
    console.error('❌ Payment Configuration Errors:');
    errors.forEach(error => console.error(`   • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Payment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Payment configuration is valid');
  }
  
  // Return validation results
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configuration: {
      paymongoConfigured: !!process.env.PAYMONGO_SECRET_KEY,
      gcashConfigured: !!process.env.GCASH_NUMBER,
      demoMode: process.env.DEMO_MODE === 'true',
      paymongoMode: process.env.PAYMONGO_MODE || 'live'
    }
  };
};

// Deep Link Validation
const validateDeepLinkGeneration = (amount, recipient, description) => {
  console.log('🔗 Validating deep link parameters...');
  
  const errors = [];
  
  // Amount validation
  if (!amount || isNaN(parseFloat(amount))) {
    errors.push(`Invalid amount: ${amount}`);
  } else if (parseFloat(amount) <= 0) {
    errors.push(`Amount must be positive: ${amount}`);
  } else if (parseFloat(amount) > 50000) {
    errors.push(`Amount exceeds GCash limit (₱50,000): ${amount}`);
  }
  
  // Recipient validation
  if (!recipient) {
    errors.push('Recipient number is required');
  } else {
    const cleanNumber = recipient.replace(/\D/g, '');
    if (cleanNumber.length !== 11 || !cleanNumber.startsWith('09')) {
      errors.push(`Invalid Philippine mobile number: ${recipient}`);
    }
  }
  
  // Description validation
  if (description && description.length > 100) {
    errors.push('Description too long (max 100 characters)');
  }
  
  if (errors.length > 0) {
    console.error('❌ Deep Link Validation Errors:');
    errors.forEach(error => console.error(`   • ${error}`));
  } else {
    console.log('✅ Deep link parameters are valid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Payment Options Validation
const validatePaymentOptions = (paymentOptions) => {
  console.log('💳 Validating payment options...');
  
  const errors = [];
  const warnings = [];
  
  if (!paymentOptions) {
    errors.push('Payment options object is required');
    return { isValid: false, errors, warnings };
  }
  
  // GCash deep link validation
  if (!paymentOptions.gcash_deep_link) {
    errors.push('GCash deep link is missing');
  } else if (!paymentOptions.gcash_deep_link.startsWith('gcash://')) {
    warnings.push('GCash deep link should start with "gcash://"');
  }
  
  // Web fallback validation
  if (!paymentOptions.gcash_web_link) {
    warnings.push('GCash web fallback is missing');
  } else {
    try {
      new URL(paymentOptions.gcash_web_link);
    } catch (urlError) {
      errors.push('GCash web link is not a valid URL');
    }
  }
  
  // PayMaya validation
  if (paymentOptions.paymaya_deep_link && !paymentOptions.paymaya_deep_link.startsWith('paymaya://')) {
    warnings.push('PayMaya deep link should start with "paymaya://"');
  }
  
  // Universal link validation
  if (paymentOptions.universal_link && !paymentOptions.universal_link.startsWith('intent://')) {
    warnings.push('Universal link should start with "intent://" for Android compatibility');
  }
  
  if (errors.length > 0) {
    console.error('❌ Payment Options Validation Errors:');
    errors.forEach(error => console.error(`   • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Payment Options Validation Warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Payment options are valid');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Error Logging Helper
const logPaymentError = (context, error, additionalData = {}) => {
  console.error(`❌ Payment Error in ${context}:`);
  console.error(`   Message: ${error.message}`);
  console.error(`   Stack: ${error.stack}`);
  
  if (Object.keys(additionalData).length > 0) {
    console.error('   Additional Data:', JSON.stringify(additionalData, null, 2));
  }
  
  // Log to external service in production
  if (process.env.NODE_ENV === 'production' && process.env.ERROR_LOGGING_URL) {
    // Send to external logging service
    fetch(process.env.ERROR_LOGGING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        error: {
          message: error.message,
          stack: error.stack
        },
        additionalData,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      })
    }).catch(logError => {
      console.error('Failed to send error to logging service:', logError);
    });
  }
};

module.exports = {
  validatePaymentConfiguration,
  validateDeepLinkGeneration,
  validatePaymentOptions,
  logPaymentError
};
