import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getToken, getUserId, logout } from '../auth';
import { clearAuthAndRestart } from '../utils/authFixer';
import { API_BASE_URL } from '../config';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userBarangay, setUserBarangay] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // null=unknown, 'active', 'pending', 'none'
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    // Fetch user profile for welcome message and barangay
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log('🔥 User profile response:', JSON.stringify(data, null, 2));
        if (response.ok && data.success && data.user) {
          // Prefer full name, fallback to username
          const { first_name, last_name, username, barangay_name } = data.user;
          setUserName(
            first_name && last_name
              ? `${first_name} ${last_name}`
              : first_name
              ? first_name
              : username || ''
          );
          console.log('🔥 Setting userBarangay to:', barangay_name);
          setUserBarangay(barangay_name || '');
        } else {
          console.log('🔥 Profile response not successful:', data);
        }
      } catch (_err) {
        // Ignore error, just show default welcome
      }
    };
    fetchProfile();
  }, []);

  // Function to fetch subscription status
  const handleAuthError = async () => {
    console.log('🔑 Clearing authentication and redirecting to login...');
    await logout();
    Alert.alert(
      'Session Expired',
      'Please log in again to continue.',
      [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/resident/Login');
          }
        }
      ],
      { cancelable: false }
    );
  };

  const fetchSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      const userId = await getUserId();
      
      if (!userId) {
        console.log('❌ No userId found, cannot fetch subscription');
        setSubscriptionStatus('none');
        return;
      }

      console.log('🔄 Fetching subscription status for userId:', userId);
      
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/billing/subscription-status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔄 Subscription API response status:', response.status);
      
      if (response.status === 401) {
        console.log('🔑 Authentication error - clearing auth and redirecting to login');
        await handleAuthError();
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Subscription API response data:', data);
        
        if (data.has_subscription && data.subscription?.status === 'active') {
          setSubscriptionStatus('active');
          console.log('🔄 Final subscription status: active');
        } else {
          setSubscriptionStatus('none');
          console.log('🔄 Final subscription status: none');
        }
      } else {
        console.log('❌ Subscription API failed with status:', response.status);
        setSubscriptionStatus('none');
      }
    } catch (error) {
      console.error('❌ Error fetching subscription status:', error);
      setSubscriptionStatus('none');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  // Refresh subscription status when page is focused (when user returns from subscription)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomePage focused - refreshing subscription status');
      
      // Immediate refresh
      fetchSubscriptionStatus();
      
      // Also refresh after a delay to catch any delayed backend updates
      setTimeout(() => {
        console.log('🔄 Delayed refresh after focus');
        fetchSubscriptionStatus();
      }, 2000);
    }, [])
  );

  // Get current day for display
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const todayIndex = today.getDay();
  const adjustedTodayIndex = todayIndex;

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>
            {userName ? `Welcome, ${userName}` : 'Welcome'}
          </Text>
        </View>
        <Image
          style={styles.profileImage}
          source={{ uri: 'https://via.placeholder.com/50' }} // Replace with actual image URL
        />
        <View style={styles.headerIcons}>
          <Ionicons
            name={subscriptionLoading ? "hourglass-outline" : "refresh-outline"}
            size={28}
            color="#FFFFFF"
            style={[styles.refreshIcon, subscriptionLoading && styles.refreshIconLoading]}
            onPress={() => {
              if (!subscriptionLoading) {
                console.log('🔄 Manual refresh triggered');
                fetchSubscriptionStatus();
              }
            }}
          />
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                '🔧 Fix Authentication Issues',
                'Having trouble with login errors? This will clear your authentication data and require you to log in again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Clear Auth', 
                    style: 'destructive',
                    onPress: () => clearAuthAndRestart(router)
                  }
                ]
              );
            }}
            style={styles.debugButton}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Ionicons
            name="settings-outline"
            size={28}
            color="#FFFFFF"
            style={styles.settingsIcon}
            onPress={() => router.push('/SetHomeLocation')}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Days of the week row */}
        <View style={styles.daysRowOuter}>
          {daysOfWeek.map((day, idx) => (
            <Text
              key={day}
              style={[
                styles.dayTextOuter,
                idx === adjustedTodayIndex && { backgroundColor: '#4CD964', color: '#fff', fontWeight: 'bold', elevation: 2 }
              ]}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* User Barangay Info */}
        {userBarangay && (
          <View style={styles.barangayInfoCard}>
            <Ionicons name="location-outline" size={20} color="#4CD964" />
            <Text style={styles.barangayText}>Your Area: {userBarangay}</Text>
          </View>
        )}

        {/* Services Section */}
        <Text style={styles.servicesTitle}>Choose your services</Text>
        <View style={[
          styles.servicesContainer,
          { justifyContent: subscriptionStatus === 'active' ? 'space-between' : 'space-around' }
        ]}>
          {/* Collection Schedule - Only show if user has active subscription */}
          {subscriptionStatus === 'active' && (
            <Pressable 
              style={styles.serviceButton}
              onPress={() => router.push('/AllSchedules')}
            >
              <Ionicons name="calendar-outline" size={32} color="#4CD964" />
              <Text style={styles.serviceText}>Collection Schedule</Text>
            </Pressable>
          )}

          {/* Special Pickup - Use previous route */}
          <Pressable 
            style={[
              styles.serviceButton,
              { width: subscriptionStatus === 'active' ? '48%' : '45%' }
            ]}
            onPress={() => router.push('/spickup')}
          >
            <Ionicons name="add-circle-outline" size={32} color="#4CD964" />
            <Text style={styles.serviceText}>Special Pickup</Text>
          </Pressable>

          {/* My Subscription - Keep same logic as previous */}
          <Pressable 
            style={[
              styles.serviceButton,
              { width: subscriptionStatus === 'active' ? '48%' : '45%' }
            ]}
            onPress={() => {
              // Navigate based on subscription status - same as previous
              console.log('🔥 Button pressed! Current subscriptionStatus:', subscriptionStatus);
              if (subscriptionStatus === 'active') {
                console.log('🔥 Navigating to SubscriptionStatusScreen');
                router.push('/SubscriptionStatusScreen');
              } else {
                console.log('🔥 Navigating to Subscription signup');
                router.push('/Subscription');
              }
            }}
          >
            <Ionicons 
              name={subscriptionStatus === 'active' ? "checkmark-circle-outline" : "pricetag-outline"} 
              size={32} 
              color="#4CD964" 
            />
            <Text style={styles.serviceText}>
              {subscriptionLoading ? 'Loading...' : (subscriptionStatus === 'active' ? 'My Subscription' : 'Subscriptions')}
            </Text>
            {subscriptionLoading && (
              <View style={styles.loadingDot}>
                <Text style={styles.loadingDotText}>●</Text>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  debugButton: {
    marginLeft: 10,
    padding: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsIcon: {
    marginLeft: 15,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    // ... (rest of the styles remain the same)
    paddingBottom: 100,
  },
  daysRowOuter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dayTextOuter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    textAlign: 'center',
    minWidth: 35,
  },
  barangayInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
  },
  barangayText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 10,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  serviceText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIcon: {
    marginRight: 15,
    padding: 5,
  },
  refreshIconLoading: {
    opacity: 0.6,
  },
  loadingDot: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  loadingDotText: {
    color: '#4CD964',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
