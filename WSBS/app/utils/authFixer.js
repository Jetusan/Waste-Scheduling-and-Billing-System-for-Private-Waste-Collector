import { Alert } from 'react-native';
import { logout } from '../auth';

/**
 * Authentication Fixer Utility
 * Helps users clear corrupted authentication data
 */

export const clearAuthAndRestart = async (router) => {
  try {
    console.log('🔧 Clearing corrupted authentication data...');
    await logout();
    
    Alert.alert(
      '🔧 Authentication Reset',
      'Your authentication data has been cleared. Please log in again.',
      [
        {
          text: 'Go to Login',
          onPress: () => {
            router.replace('/resident/Login');
          }
        }
      ],
      { cancelable: false }
    );
  } catch (error) {
    console.error('Error clearing auth:', error);
    Alert.alert('Error', 'Failed to clear authentication. Please restart the app.');
  }
};

export const handlePersistent401 = async (router, errorCount = 0) => {
  if (errorCount >= 2) {
    // If we've had multiple 401 errors, clear auth automatically
    console.log('🚨 Multiple 401 errors detected - auto-clearing auth');
    await clearAuthAndRestart(router);
  } else {
    // First 401 error, just log it
    console.log('⚠️ 401 error detected, count:', errorCount + 1);
  }
};
