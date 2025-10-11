import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { isFirstTime, isAuthenticated, getRole } from './auth';
import { validateMobileEnvironment } from '../utils/envValidator';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState('/welcome');

  useEffect(() => {
    const determineRoute = async () => {
      try {
        // Validate environment on app startup (development only)
        if (__DEV__) {
          try {
            validateMobileEnvironment();
          } catch (error) {
            console.warn('Environment validation failed:', error);
          }
        }

        const [firstTime, authenticated, userRole] = await Promise.all([
          isFirstTime(),
          isAuthenticated(),
          getRole()
        ]);

        console.log('🚀 App Launch - First Time:', firstTime, 'Authenticated:', authenticated, 'Role:', userRole);

        if (authenticated && userRole) {
          // User is logged in - go to appropriate homepage
          if (userRole === 'resident') {
            setDestination('/resident/HomePage');
          } else if (userRole === 'collector') {
            setDestination('/collector/CHome');
          } else {
            // Unknown role, go to role selection
            setDestination('/role');
          }
        } else if (firstTime) {
          // First time user - show welcome flow
          setDestination('/welcome');
        } else {
          // Returning user but not logged in - skip welcome, go to role selection
          setDestination('/role');
        }
      } catch (error) {
        console.error('Error determining route:', error);
        // Fallback to welcome on error
        setDestination('/welcome');
      } finally {
        setLoading(false);
      }
    };

    determineRoute();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
