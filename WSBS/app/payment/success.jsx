import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PaymentSuccess() {
  const router = useRouter();

  const handleGoHome = () => {
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
      if (isMounted) {
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
  }, [router]);

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
          You will be redirected automatically...
        </Text>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={handleGoHome}
        >
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.homeButtonText}>Go to Home Now</Text>
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
});
