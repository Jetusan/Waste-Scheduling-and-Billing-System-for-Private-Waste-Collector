/**
 * Business Rules Configuration
 * 
 * This file contains all business logic rules for the waste collection system.
 * It provides a centralized place to manage scheduling, pricing, and operational rules.
 */

/**
 * Working hours configuration
 */
export const WORKING_HOURS = {
  start: '06:00', // 6 AM
  end: '18:00',   // 6 PM
  timezone: 'Asia/Manila'
};

/**
 * Regular collection schedule configuration
 */
export const REGULAR_COLLECTION = {
  // Days when regular collection happens (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  days: [3, 4, 5], // Wednesday, Thursday, Friday
  
  // Schedule details for each day
  schedule: {
    3: { // Wednesday
      wasteType: 'Non-biodegradable',
      description: 'Plastic Bags, Cellophane, Plastic Bottle, Packaging, Metal Cans, E-waste',
      timeSlots: ['08:00-10:00', '10:00-12:00', '14:00-16:00']
    },
    4: { // Thursday  
      wasteType: 'Biodegradable',
      description: 'Balat ng gulay, balat ng prutas, damo, dahon, sanga, kahoy',
      timeSlots: ['08:00-10:00', '10:00-12:00', '14:00-16:00']
    },
    5: { // Friday
      wasteType: 'Recyclable', 
      description: 'Papers, Cardboard, glass bottles',
      timeSlots: ['08:00-10:00', '10:00-12:00', '14:00-16:00']
    }
  }
};

/**
 * Special pickup configuration
 */
export const SPECIAL_PICKUP = {
  // Pricing
  pricePerBag: 25.00,
  maxBagsPerRequest: 50,
  minBagsPerRequest: 1,
  
  // Scheduling rules
  scheduling: {
    // Strategy for handling collection days - Following advisor's requirement
    // Options: 'block_all', 'allow_all', 'allow_with_restrictions', 'allow_different_areas'
    collectionDayStrategy: 'block_all', // Block Wed-Thu-Fri completely
    
    // Advance booking requirements
    minAdvanceHours: 24, // Must book at least 24 hours in advance
    maxAdvanceDays: 30,  // Can book up to 30 days in advance
    
    // Time restrictions
    allowedTimeSlots: [
      '08:00-10:00',
      '10:00-12:00', 
      '13:00-15:00',
      '15:00-17:00'
    ],
    
    // Day-specific rules - Following advisor's requirement: Only Mon, Tue, Sat allowed
    dayRules: {
      0: { allowed: false, label: 'Sunday', restrictions: ['not_allowed'] }, // Sunday - NOT ALLOWED
      1: { allowed: true, label: 'Monday', restrictions: [] }, // Monday - ALLOWED
      2: { allowed: true, label: 'Tuesday', restrictions: [] }, // Tuesday - ALLOWED
      3: { // Wednesday - Collection Day - NOT ALLOWED
        allowed: false, 
        label: 'Wednesday',
        restrictions: ['collection_day'],
        reason: 'Wednesday is reserved for regular non-biodegradable waste collection'
      },
      4: { // Thursday - Collection Day - NOT ALLOWED
        allowed: false,
        label: 'Thursday', 
        restrictions: ['collection_day'],
        reason: 'Thursday is reserved for regular biodegradable waste collection'
      },
      5: { // Friday - Collection Day - NOT ALLOWED
        allowed: false,
        label: 'Friday',
        restrictions: ['collection_day'],
        reason: 'Friday is reserved for regular recyclable waste collection'
      },
      6: { allowed: true, label: 'Saturday', restrictions: [] } // Saturday - ALLOWED
    }
  },
  
  // Area-based restrictions
  areaRestrictions: {
    // Areas that have regular collection on specific days
    regularCollectionAreas: {
      3: ['San Isidro VSM Heights Phase 1', 'Barangay Centro'], // Wednesday areas
      4: ['Barangay Poblacion', 'Subdivision A'], // Thursday areas  
      5: ['Barangay Riverside', 'Commercial District'] // Friday areas
    }
  }
};

/**
 * Subscription plans configuration
 */
export const SUBSCRIPTION_PLANS = {
  full: {
    id: 'full',
    name: 'Full Plan',
    price: 199.00,
    currency: 'PHP',
    frequency: 'monthly',
    bagsPerWeek: 3,
    bagsPerMonth: 12,
    extraBagCost: 30.00,
    collectionDays: [3, 4, 5], // Wed-Thu-Fri
    contract: {
      duration: 12, // months
      preTerminationFee: 200.00
    }
  }
};

/**
 * Validates if a special pickup can be scheduled on a specific date/time
 * @param {Date} requestedDate - The requested pickup date
 * @param {string} requestedTime - The requested pickup time (HH:MM format)
 * @param {string} userArea - User's area/barangay
 * @param {number} bagQuantity - Number of bags
 * @returns {Object} - Validation result
 */
export const validateSpecialPickupSchedule = (requestedDate, requestedTime, userArea, bagQuantity = 1) => {
  const dayOfWeek = requestedDate.getDay();
  const dayRule = SPECIAL_PICKUP.scheduling.dayRules[dayOfWeek];
  
  // Check if day is allowed
  if (!dayRule.allowed) {
    return {
      isValid: false,
      reason: `Special pickups are not available on ${dayRule.label}`,
      suggestedDays: getAvailableDays()
    };
  }
  
  // Check advance booking requirements
  const now = new Date();
  const hoursDifference = (requestedDate - now) / (1000 * 60 * 60);
  
  if (hoursDifference < SPECIAL_PICKUP.scheduling.minAdvanceHours) {
    return {
      isValid: false,
      reason: `Special pickups must be booked at least ${SPECIAL_PICKUP.scheduling.minAdvanceHours} hours in advance`,
      earliestDate: new Date(now.getTime() + SPECIAL_PICKUP.scheduling.minAdvanceHours * 60 * 60 * 1000)
    };
  }
  
  const daysDifference = (requestedDate - now) / (1000 * 60 * 60 * 24);
  if (daysDifference > SPECIAL_PICKUP.scheduling.maxAdvanceDays) {
    return {
      isValid: false,
      reason: `Special pickups can only be booked up to ${SPECIAL_PICKUP.scheduling.maxAdvanceDays} days in advance`
    };
  }
  
  // Check working hours
  if (requestedTime) {
    const [hours, minutes] = requestedTime.split(':').map(Number);
    const requestedTimeMinutes = hours * 60 + minutes;
    const [startHours, startMinutes] = WORKING_HOURS.start.split(':').map(Number);
    const [endHours, endMinutes] = WORKING_HOURS.end.split(':').map(Number);
    const startTimeMinutes = startHours * 60 + startMinutes;
    const endTimeMinutes = endHours * 60 + endMinutes;
    
    if (requestedTimeMinutes < startTimeMinutes || requestedTimeMinutes > endTimeMinutes) {
      return {
        isValid: false,
        reason: `Special pickups are only available during working hours (${WORKING_HOURS.start} - ${WORKING_HOURS.end})`
      };
    }
  }
  
  // Check collection day restrictions - Following advisor's requirement
  if (REGULAR_COLLECTION.days.includes(dayOfWeek)) {
    const strategy = SPECIAL_PICKUP.scheduling.collectionDayStrategy;
    
    // Always block collection days as per advisor's requirement
    return {
      isValid: false,
      reason: dayRule.reason || `${dayRule.label} is reserved for regular collection. Please choose Monday, Tuesday, or Saturday.`,
      suggestedDays: [1, 2, 6], // Monday, Tuesday, Saturday only
      suggestedDayNames: ['Monday', 'Tuesday', 'Saturday'],
      alternativeMessage: 'Special pickups are only available on Monday, Tuesday, and Saturday to avoid conflicts with regular collection schedule.'
    };
  }
  
  // Calculate pricing
  const basePrice = SPECIAL_PICKUP.pricePerBag * bagQuantity;
  const priceMultiplier = dayRule.priceMultiplier || 1;
  const totalPrice = basePrice * priceMultiplier;
  
  return {
    isValid: true,
    pricing: {
      basePrice,
      priceMultiplier,
      totalPrice,
      isPremium: priceMultiplier > 1
    },
    restrictions: dayRule.restrictions || [],
    availableSlots: dayRule.availableSlots || SPECIAL_PICKUP.scheduling.allowedTimeSlots
  };
};

/**
 * Gets list of available days for special pickup - Following advisor's requirement
 * @returns {Array} - Array of available day numbers (Monday=1, Tuesday=2, Saturday=6)
 */
export const getAvailableDays = () => {
  // Fixed to advisor's requirement: Only Monday, Tuesday, Saturday
  return [1, 2, 6]; // Monday, Tuesday, Saturday
};

/**
 * Gets user-friendly day names
 * @param {Array} dayNumbers - Array of day numbers (0-6)
 * @returns {Array} - Array of day names
 */
export const getDayNames = (dayNumbers) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNumbers.map(day => dayNames[day]);
};

/**
 * Checks if current time is within working hours
 * @returns {boolean} - Whether it's currently working hours
 */
export const isWithinWorkingHours = () => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  return currentTime >= WORKING_HOURS.start && currentTime <= WORKING_HOURS.end;
};

// Example usage:
/*
import { validateSpecialPickupSchedule, getDayNames, getAvailableDays } from './config/businessRules';

// Validate a special pickup request
const requestedDate = new Date('2024-01-17'); // Wednesday
const validation = validateSpecialPickupSchedule(
  requestedDate, 
  '14:00', 
  'San Isidro VSM Heights Phase 1', 
  3
);

if (validation.isValid) {
  console.log('Pickup can be scheduled');
  console.log('Total price:', validation.pricing.totalPrice);
  if (validation.pricing.isPremium) {
    console.log('Premium pricing applies');
  }
} else {
  console.log('Cannot schedule pickup:', validation.reason);
  if (validation.suggestedDays) {
    console.log('Available days:', getDayNames(validation.suggestedDays));
  }
}
*/
