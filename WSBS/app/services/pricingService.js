import { API_BASE_URL } from '../config';

class PricingService {
  constructor() {
    this.cachedPricing = null;
    this.lastFetchTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  // Get current pricing with caching
  async getCurrentPricing() {
    try {
      // Check if we have cached data that's still valid
      if (this.cachedPricing && this.lastFetchTime && 
          (Date.now() - this.lastFetchTime) < this.cacheTimeout) {
        console.log('💰 Using cached pricing data');
        return this.cachedPricing;
      }

      console.log('🔄 Fetching current pricing from API...');
      const response = await fetch(`${API_BASE_URL}/pricing/current-pricing`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const pricing = await response.json();
      
      // Cache the pricing data
      this.cachedPricing = pricing;
      this.lastFetchTime = Date.now();
      
      console.log('✅ Pricing data fetched and cached:', {
        subscriptionPrice: pricing.subscription?.fullPlan?.price,
        specialPickupPrice: pricing.specialPickup?.pricePerBag,
        cachedAt: new Date().toISOString()
      });
      
      return pricing;
      
    } catch (error) {
      console.error('❌ Error fetching pricing:', error);
      
      // Return cached data if available, otherwise return defaults
      if (this.cachedPricing) {
        console.log('⚠️ Using cached pricing due to fetch error');
        return this.cachedPricing;
      }
      
      // Return default pricing as fallback
      console.log('⚠️ Using default pricing as fallback');
      return this.getDefaultPricing();
    }
  }

  // Get subscription pricing
  async getSubscriptionPricing() {
    const pricing = await this.getCurrentPricing();
    return {
      monthlyFee: pricing.subscription?.fullPlan?.price || 199.00,
      extraBagCost: pricing.subscription?.fullPlan?.extraBagCost || 30.00,
      preTerminationFee: pricing.subscription?.fullPlan?.preTerminationFee || 200.00
    };
  }

  // Get special pickup pricing
  async getSpecialPickupPricing() {
    const pricing = await this.getCurrentPricing();
    return {
      pricePerBag: pricing.specialPickup?.pricePerBag || 25.00,
      minBags: pricing.specialPickup?.minBags || 1,
      maxBags: pricing.specialPickup?.maxBags || 50
    };
  }

  // Calculate special pickup total with discounts
  async calculateSpecialPickupTotal(bagQuantity, userType = 'regular') {
    try {
      const response = await fetch(
        `${API_BASE_URL}/pricing/special-pickup-pricing?bagQuantity=${bagQuantity}&userType=${userType}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('❌ Error calculating special pickup total:', error);
      
      // Fallback calculation
      const pricing = await this.getSpecialPickupPricing();
      const subtotal = bagQuantity * pricing.pricePerBag;
      
      return {
        bagQuantity: bagQuantity,
        pricePerBag: pricing.pricePerBag,
        subtotal: subtotal,
        discount: 0,
        discountReason: '',
        finalPrice: subtotal,
        currency: 'PHP'
      };
    }
  }

  // Get late fees and penalties
  async getLateFees() {
    const pricing = await this.getCurrentPricing();
    return {
      lateFeeAmount: pricing.lateFees?.lateFeeAmount || 50.00,
      gracePeriodDays: pricing.lateFees?.gracePeriodDays || 7
    };
  }

  // Get discount information
  async getDiscounts() {
    const pricing = await this.getCurrentPricing();
    return {
      seniorCitizenDiscount: pricing.discounts?.seniorCitizenDiscount || 0.20,
      pwdDiscount: pricing.discounts?.pwdDiscount || 0.20,
      bulkDiscount: {
        threshold: pricing.discounts?.bulkDiscount?.threshold || 10,
        discountRate: pricing.discounts?.bulkDiscount?.discountRate || 0.10
      }
    };
  }

  // Clear cache (useful when user manually refreshes)
  clearCache() {
    console.log('🗑️ Clearing pricing cache');
    this.cachedPricing = null;
    this.lastFetchTime = null;
  }

  // Force refresh pricing
  async refreshPricing() {
    this.clearCache();
    return await this.getCurrentPricing();
  }

  // Default pricing fallback
  getDefaultPricing() {
    return {
      subscription: {
        fullPlan: {
          price: 199.00,
          extraBagCost: 30.00,
          preTerminationFee: 200.00
        }
      },
      specialPickup: {
        pricePerBag: 25.00,
        minBags: 1,
        maxBags: 50
      },
      lateFees: {
        lateFeeAmount: 50.00,
        gracePeriodDays: 7
      },
      discounts: {
        seniorCitizenDiscount: 0.20,
        pwdDiscount: 0.20,
        bulkDiscount: {
          threshold: 10,
          discountRate: 0.10
        }
      }
    };
  }
}

// Export singleton instance
export default new PricingService();
