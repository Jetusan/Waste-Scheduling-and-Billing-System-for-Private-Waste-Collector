import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isValidSession, setIsValidSession] = useState(true);
  const navigationAttempted = useRef(false);

  // Check if this success page should be shown
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Use timestamp-based session tracking
        const currentTime = Date.now();
        const sessionId = params.session || currentTime.toString();
        const lastSuccessTime = await AsyncStorage.getItem('lastPaymentSuccessTime');
        
        console.log('🎉 Payment success page loaded with session:', sessionId);
        console.log('🎉 Last success time:', lastSuccessTime);
        
        // If last success was within 10 seconds, consider it duplicate
        if (lastSuccessTime && (currentTime - parseInt(lastSuccessTime)) < 10000) {
          console.log('🎉 Payment success already shown recently, redirecting...');
          setIsValidSession(false);
          router.replace('/resident/HomePage');
          return;
        }
        
        // Mark this session as shown with current timestamp
        await AsyncStorage.setItem('lastPaymentSuccessTime', currentTime.toString());
        await AsyncStorage.setItem('lastPaymentSuccessSession', sessionId);
        setIsValidSession(true);
        
        console.log('🎉 Payment success page is valid, showing...');
      } catch (error) {
        console.error('Session check error:', error);
        setIsValidSession(true); // Default to showing the page
      }
    };
    
    checkSession();
  }, [params.session, router]);

  const handleGoHome = () => {
    if (navigationAttempted.current || hasNavigated) {
      console.log('Navigation already attempted, ignoring...');
      return;
    }
    
    navigationAttempted.current = true;
    setHasNavigated(true);
    
    try {
      router.replace('/resident/HomePage');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      router.push('/resident/HomePage');
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Auto navigate back to HomePage after 3 seconds
    const timer = setTimeout(() => {
      if (isMounted && !navigationAttempted.current && !hasNavigated) {
        navigationAttempted.current = true;
        setHasNavigated(true);
        
        try {
          router.replace('/resident/HomePage');
        } catch (error) {
          console.error('Auto-navigation error:', error);
          // Fallback navigation
          router.push('/resident/HomePage');
        }
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [router, hasNavigated]);

  // Don't render anything if session is invalid (already shown)
  if (!isValidSession) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        </View>
        
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.message}>
          Your subscription has been activated successfully.
        </Text>
        <Text style={styles.subMessage}>
          {hasNavigated ? 'Redirecting...' : 'You will be redirected automatically...'}
        </Text>
        
        <TouchableOpacity 
          style={[styles.homeButton, hasNavigated && styles.homeButtonDisabled]}
          onPress={handleGoHome}
          disabled={hasNavigated}
        >
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.homeButtonText}>
            {hasNavigated ? 'Redirecting...' : 'Go to Home Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  subMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  homeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  homeButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
});
