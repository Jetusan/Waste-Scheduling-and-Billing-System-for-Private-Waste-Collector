const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get current pricing configuration
router.get('/pricing-config', async (req, res) => {
  try {
    console.log('🔄 Fetching pricing configuration...');
    
    // Get pricing settings from database or return defaults
    const query = `
      SELECT * FROM pricing_config 
      WHERE is_active = true 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    let result;
    try {
      result = await pool.query(query);
    } catch (dbError) {
      // If table doesn't exist, create it with default values
      console.log('📋 Creating pricing_config table with defaults...');
      await createPricingConfigTable();
      result = await pool.query(query);
    }
    
    let pricingConfig;
    if (result.rows.length > 0) {
      pricingConfig = result.rows[0].config_data;
    } else {
      // Return default configuration
      pricingConfig = getDefaultPricingConfig();
      
      // Insert default config into database
      await insertDefaultPricingConfig(pricingConfig);
    }
    
    console.log('✅ Pricing configuration retrieved successfully');
    res.json(pricingConfig);
    
  } catch (error) {
    console.error('❌ Error fetching pricing configuration:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pricing configuration',
      details: error.message 
    });
  }
});

// Update pricing configuration
router.put('/pricing-config', async (req, res) => {
  try {
    console.log('🔄 Updating pricing configuration...');
    const newConfig = req.body;
    
    // Validate the configuration
    if (!validatePricingConfig(newConfig)) {
      return res.status(400).json({ 
        error: 'Invalid pricing configuration',
        message: 'Please check all required fields and ensure positive values'
      });
    }
    
    // Deactivate current config
    await pool.query('UPDATE pricing_config SET is_active = false WHERE is_active = true');
    
    // Insert new configuration
    const insertQuery = `
      INSERT INTO pricing_config (config_data, is_active, updated_at, updated_by)
      VALUES ($1, true, CURRENT_TIMESTAMP, $2)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      JSON.stringify(newConfig),
      'admin' // You can replace this with actual admin user ID
    ]);
    
    console.log('✅ Pricing configuration updated successfully');
    res.json({
      success: true,
      message: 'Pricing configuration updated successfully',
      config: result.rows[0].config_data
    });
    
  } catch (error) {
    console.error('❌ Error updating pricing configuration:', error);
    res.status(500).json({ 
      error: 'Failed to update pricing configuration',
      details: error.message 
    });
  }
});

// Get current pricing for mobile app (public endpoint)
router.get('/current-pricing', async (req, res) => {
  try {
    console.log('🔄 Fetching current pricing for mobile app...');
    
    // Get current pricing config
    const configQuery = `
      SELECT config_data FROM pricing_config 
      WHERE is_active = true 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    let configResult;
    try {
      configResult = await pool.query(configQuery);
    } catch (dbError) {
      // If table doesn't exist, create it and return defaults
      console.log('📋 Creating pricing_config table with defaults...');
      await createPricingConfigTable();
      const defaultConfig = getDefaultPricingConfig();
      await insertDefaultPricingConfig(defaultConfig);
      return res.json(defaultConfig);
    }
    
    let config = getDefaultPricingConfig();
    if (configResult.rows.length > 0) {
      config = configResult.rows[0].config_data;
      console.log('📊 Using database pricing config:', {
        specialPickupPrice: config.specialPickup?.pricePerBag,
        subscriptionPrice: config.subscription?.fullPlan?.price
      });
    } else {
      // Insert default config if none exists
      await insertDefaultPricingConfig(config);
      console.log('📊 Using default pricing config (no database config found)');
    }
    
    console.log('✅ Current pricing retrieved for mobile app');
    res.json(config);
    
  } catch (error) {
    console.error('❌ Error fetching current pricing:', error);
    // Return default config on error to prevent app crashes
    res.json(getDefaultPricingConfig());
  }
});

// Get pricing for special pickup calculation
router.get('/special-pickup-pricing', async (req, res) => {
  try {
    const { bagQuantity, userType } = req.query;
    
    // Get current pricing config
    const configQuery = `
      SELECT config_data FROM pricing_config 
      WHERE is_active = true 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    const configResult = await pool.query(configQuery);
    let config = getDefaultPricingConfig();
    
    if (configResult.rows.length > 0) {
      config = configResult.rows[0].config_data;
    }
    
    const bags = parseInt(bagQuantity) || 1;
    let pricePerBag = config.specialPickup.pricePerBag;
    let totalPrice = bags * pricePerBag;
    let discount = 0;
    let discountReason = '';
    
    // Apply discounts
    if (userType === 'senior_citizen' && config.discounts.seniorCitizenDiscount > 0) {
      discount = totalPrice * config.discounts.seniorCitizenDiscount;
      discountReason = 'Senior Citizen Discount';
    } else if (userType === 'pwd' && config.discounts.pwdDiscount > 0) {
      discount = totalPrice * config.discounts.pwdDiscount;
      discountReason = 'PWD Discount';
    } else if (bags >= config.discounts.bulkDiscount.threshold && config.discounts.bulkDiscount.discountRate > 0) {
      discount = totalPrice * config.discounts.bulkDiscount.discountRate;
      discountReason = `Bulk Discount (${bags} bags)`;
    }
    
    const finalPrice = totalPrice - discount;
    
    res.json({
      bagQuantity: bags,
      pricePerBag: pricePerBag,
      subtotal: totalPrice,
      discount: discount,
      discountReason: discountReason,
      finalPrice: finalPrice,
      currency: 'PHP'
    });
    
  } catch (error) {
    console.error('❌ Error calculating special pickup pricing:', error);
    res.status(500).json({ 
      error: 'Failed to calculate pricing',
      details: error.message 
    });
  }
});

// Helper functions
async function createPricingConfigTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS pricing_config (
      id SERIAL PRIMARY KEY,
      config_data JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(255)
    );
    
    CREATE INDEX IF NOT EXISTS idx_pricing_config_active 
    ON pricing_config(is_active) WHERE is_active = true;
  `;
  
  await pool.query(createTableQuery);
}

function getDefaultPricingConfig() {
  return {
    subscription: {
      fullPlan: {
        price: 199.00,
        extraBagCost: 30.00,
        preTerminationFee: 200.00
      }
    },
    specialPickup: {
      pricePerBag: 30.00
    },
    lateFees: {
      lateFeeAmount: 50.00,
      gracePeriodDays: 7
    },
    discounts: {
      seniorCitizenDiscount: 0.20, // 20%
      pwdDiscount: 0.20, // 20%
      bulkDiscount: {
        threshold: 10, // bags
        discountRate: 0.10 // 10%
      }
    }
  };
}

async function insertDefaultPricingConfig(config) {
  const insertQuery = `
    INSERT INTO pricing_config (config_data, is_active, updated_by)
    VALUES ($1, true, 'system')
  `;
  
  await pool.query(insertQuery, [JSON.stringify(config)]);
}

function validatePricingConfig(config) {
  try {
    // Check required structure and positive values
    return (
      config.subscription &&
      config.subscription.fullPlan &&
      config.subscription.fullPlan.price > 0 &&
      config.subscription.fullPlan.extraBagCost > 0 &&
      config.specialPickup &&
      config.specialPickup.pricePerBag > 0 &&
      config.specialPickup.minBags > 0 &&
      config.specialPickup.maxBags > config.specialPickup.minBags &&
      config.lateFees &&
      config.lateFees.lateFeeAmount >= 0 &&
      config.lateFees.gracePeriodDays >= 0 &&
      config.discounts &&
      config.discounts.seniorCitizenDiscount >= 0 &&
      config.discounts.seniorCitizenDiscount <= 1 &&
      config.discounts.pwdDiscount >= 0 &&
      config.discounts.pwdDiscount <= 1 &&
      config.discounts.bulkDiscount &&
      config.discounts.bulkDiscount.threshold > 0 &&
      config.discounts.bulkDiscount.discountRate >= 0 &&
      config.discounts.bulkDiscount.discountRate <= 1
    );
  } catch (error) {
    return false;
  }
}

module.exports = router;
