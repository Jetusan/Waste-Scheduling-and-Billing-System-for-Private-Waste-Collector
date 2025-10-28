/**
 * User ID Standardization Utility
 * 
 * This utility ensures consistent user ID handling across the entire application.
 * It provides a single source of truth for extracting and formatting user IDs.
 */

/**
 * Extracts user ID from various possible sources in a standardized way
 * @param {Object} userObject - User object from API response or JWT token
 * @returns {string|number|null} - Standardized user ID
 */
export const extractUserId = (userObject) => {
  if (!userObject) return null;
  
  // Priority order for user ID extraction
  const possibleFields = [
    'user_id',    // Primary field used in database
    'userId',     // Camel case variant
    'id',         // Generic ID field
    'sub'         // JWT subject field
  ];
  
  for (const field of possibleFields) {
    if (userObject[field] !== undefined && userObject[field] !== null) {
      return userObject[field];
    }
  }
  
  return null;
};

/**
 * Formats user ID for API requests (always as string)
 * @param {string|number} userId - User ID to format
 * @returns {string} - Formatted user ID
 */
export const formatUserIdForAPI = (userId) => {
  if (userId === null || userId === undefined) {
    throw new Error('User ID cannot be null or undefined');
  }
  return String(userId);
};

/**
 * Formats user ID for database operations (always as number)
 * @param {string|number} userId - User ID to format
 * @returns {number} - Formatted user ID
 */
export const formatUserIdForDB = (userId) => {
  if (userId === null || userId === undefined) {
    throw new Error('User ID cannot be null or undefined');
  }
  const numericId = Number(userId);
  if (isNaN(numericId)) {
    throw new Error(`Invalid user ID format: ${userId}`);
  }
  return numericId;
};

/**
 * Validates that a user ID is valid
 * @param {any} userId - User ID to validate
 * @returns {boolean} - Whether the user ID is valid
 */
export const isValidUserId = (userId) => {
  if (userId === null || userId === undefined) return false;
  const numericId = Number(userId);
  return !isNaN(numericId) && numericId > 0;
};

/**
 * Standard error messages for user ID issues
 */
export const USER_ID_ERRORS = {
  NOT_FOUND: 'User ID not found. Please log in again.',
  INVALID_FORMAT: 'Invalid user ID format.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  MISMATCH: 'User ID mismatch detected.'
};

/**
 * Creates a standardized user ID validation middleware for components
 * @param {Function} onError - Error handler function
 * @returns {Function} - Validation function
 */
export const createUserIdValidator = (onError) => {
  return (userId, context = 'operation') => {
    if (!isValidUserId(userId)) {
      const error = new Error(`${USER_ID_ERRORS.NOT_FOUND} Context: ${context}`);
      onError(error);
      return false;
    }
    return true;
  };
};

// Example usage patterns:
/*
// In React components:
import { extractUserId, formatUserIdForAPI, isValidUserId } from './utils/userIdStandardization';

// Extract user ID from profile response
const userId = extractUserId(profileData.user);

// Format for API call
const apiUserId = formatUserIdForAPI(userId);

// Validate before using
if (isValidUserId(userId)) {
  // Proceed with operation
}

// In backend controllers:
const { extractUserId, formatUserIdForDB } = require('./utils/userIdStandardization');

// Extract from JWT token
const userId = extractUserId(req.user);

// Format for database query
const dbUserId = formatUserIdForDB(userId);
*/
