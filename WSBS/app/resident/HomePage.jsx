import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getToken, getUserId, logout } from '../auth';
import { clearAuthAndRestart } from '../utils/authFixer';
import { API_BASE_URL } from '../config';
import LocationStatusCard from '../components/LocationStatusCard';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userBarangay, setUserBarangay] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // null=unknown, 'active', 'pending', 'none'
  const [subscriptionLoading, setSubscriptionLoading] = useState(true); // Start with loading true
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Combined data fetching for better performance
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Get auth data once to avoid multiple storage reads
        const [token, userId] = await Promise.all([
          getToken(),
          getUserId()
        ]);
        
        if (!token || !userId) {
          console.log('❌ Missing auth data - token:', !!token, 'userId:', !!userId);
          return;
        }

        // Fetch profile and subscription in parallel for faster loading
        const [profileResponse, subscriptionResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => {
            console.log('🔥 Profile fetch failed:', err.message);
            return null;
          }),
          
          fetch(`${API_BASE_URL}/api/billing/subscription-status/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).catch(err => {
            console.log('🔄 Subscription fetch failed:', err.message);
            return null;
          })
        ]);

        // Process profile data
        if (profileResponse?.ok) {
          try {
            const profileData = await profileResponse.json();
            console.log('🔥 User profile loaded successfully');
            if (profileData.success && profileData.user) {
              const { first_name, last_name, username, barangay_name } = profileData.user;
              setUserName(
                first_name && last_name
                  ? `${first_name} ${last_name}`
                  : first_name || username || ''
              );
              setUserBarangay(barangay_name || '');
            }
          } catch (err) {
            console.log('🔥 Profile data parsing failed');
          }
        }

        // Process subscription data
        if (subscriptionResponse?.ok) {
          try {
            const subscriptionData = await subscriptionResponse.json();
            console.log('🔄 Subscription loaded successfully:', subscriptionData);
            
            // Handle both response formats: hasSubscription (new) and has_subscription (old)
            const hasSubscription = subscriptionData.hasSubscription ?? subscriptionData.has_subscription;
            const subscriptionStatus = subscriptionData.subscription?.status;
            const uiState = subscriptionData.uiState;
            
            console.log('🔄 Subscription details:', { hasSubscription, subscriptionStatus, uiState });
            
            if (hasSubscription) {
              // Check subscription state based on uiState or subscription status
              if (uiState === 'active' || subscriptionStatus === 'active') {
                setSubscriptionStatus('active');
                console.log('🔄 Setting subscription status to ACTIVE');
              } else if (uiState === 'pending_gcash' || uiState === 'pending_cash' || subscriptionStatus === 'pending_payment') {
                setSubscriptionStatus('pending');
                console.log('🔄 Setting subscription status to PENDING');
              } else {
                // If has subscription but invalid state (cancelled, expired, etc.), treat as no subscription
                setSubscriptionStatus('none');
                console.log('🔄 Setting subscription status to NONE (invalid state)');
              }
            } else {
              setSubscriptionStatus('none');
              console.log('🔄 Setting subscription status to NONE');
            }
          } catch (err) {
            console.log('🔄 Subscription data parsing failed:', err);
            setSubscriptionStatus('none');
          }
        } else if (subscriptionResponse?.status === 401) {
          console.log('🔑 Authentication error - clearing auth');
          await handleAuthError();
          return;
        } else {
          setSubscriptionStatus('none');
        }

      } catch (error) {
        console.error('❌ Error in combined data fetch:', error);
        setSubscriptionStatus('none');
      } finally {
        setSubscriptionLoading(false);
      }
    };

    setSubscriptionLoading(true);
    fetchAllData();
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

  // Quick subscription-only refresh for manual refresh button
  const fetchSubscriptionStatus = async () => {
    // Debounce: Don't fetch if we just fetched within the last 2 seconds
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      console.log('🔄 Skipping subscription fetch - too soon after last fetch');
      return;
    }
    
    try {
      setSubscriptionLoading(true);
      setLastFetchTime(now);
      
      const [token, userId] = await Promise.all([getToken(), getUserId()]);
      
      if (!token || !userId) {
        console.log('❌ Missing auth data for subscription fetch');
        setSubscriptionStatus('none');
        return;
      }

      console.log('🔄 Quick subscription refresh for userId:', userId);
      
      const response = await fetch(`${API_BASE_URL}/api/billing/subscription-status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        await handleAuthError();
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Quick refresh data:', data);
        
        // Handle both response formats
        const hasSubscription = data.hasSubscription ?? data.has_subscription;
        const subscriptionStatus = data.subscription?.status;
        const uiState = data.uiState;
        
        if (hasSubscription) {
          if (uiState === 'active' || subscriptionStatus === 'active') {
            setSubscriptionStatus('active');
            console.log('🔄 Quick refresh: Setting to ACTIVE');
          } else if (uiState === 'pending_gcash' || uiState === 'pending_cash' || subscriptionStatus === 'pending_payment') {
            setSubscriptionStatus('pending');
            console.log('🔄 Quick refresh: Setting to PENDING');
          } else {
            // If has subscription but invalid state, treat as no subscription
            setSubscriptionStatus('none');
            console.log('🔄 Quick refresh: Setting to NONE (invalid state)');
          }
        } else {
          setSubscriptionStatus('none');
          console.log('🔄 Quick refresh: Setting to NONE');
        }
      } else {
        setSubscriptionStatus('none');
      }
    } catch (error) {
      console.error('❌ Error refreshing subscription:', error);
      setSubscriptionStatus('none');
    } finally {
      setSubscriptionLoading(false);
    }
  };


  // Refresh subscription status when page is focused (when user returns from subscription)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomePage focused - will refresh subscription if not loading');
      
      // Use a small delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        if (!subscriptionLoading) {
          fetchSubscriptionStatus();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
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
          <TouchableOpacity onPress={() => router.push('/Settings')}>
            <Ionicons
              name="settings-outline"
              size={28}
              color="#FFFFFF"
              style={styles.settingsIcon}
            />
          </TouchableOpacity>
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

        {/* Location Status Card */}
        <LocationStatusCard />

        {/* Services Section */}
        <Text style={styles.servicesTitle}>Choose your services</Text>
        <View style={[
          styles.servicesContainer,
          { justifyContent: subscriptionStatus === 'active' ? 'space-between' : 'space-around' }
        ]}>
          {/* Collection Schedule - Only show if user has ACTIVE subscription (payment completed) */}
          {subscriptionStatus === 'active' && (
            <Pressable 
              style={styles.serviceButton}
              onPress={() => router.push('/AllSchedules')}
            >
              <Ionicons name="calendar-outline" size={28} color="#4CD964" />
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
            <Ionicons name="add-circle-outline" size={28} color="#4CD964" />
            <Text style={styles.serviceText}>Special Pickup</Text>
          </Pressable>

          {/* Subscription/My Subscription Button */}
          <Pressable 
            style={[
              styles.serviceButton,
              { width: subscriptionStatus === 'active' ? '48%' : '45%' }
            ]}
            onPress={() => {
              // Navigate based on subscription status
              console.log('🔥 Button pressed! Current subscriptionStatus:', subscriptionStatus);
              if (subscriptionStatus === 'active' || subscriptionStatus === 'pending') {
                console.log('🔥 Navigating to SubscriptionStatusScreen');
                router.push('/SubscriptionStatusScreen');
              } else {
                console.log('🔥 Navigating to Subscription signup');
                router.push('/Subscription');
              }
            }}
          >
            <Ionicons 
              name={subscriptionStatus === 'active' ? "checkmark-circle-outline" : subscriptionStatus === 'pending' ? "time-outline" : "pricetag-outline"} 
              size={28} 
              color="#4CD964" 
            />
            <Text style={styles.serviceText}>
              {subscriptionLoading ? 'Loading...' : 
                (subscriptionStatus === 'active' || subscriptionStatus === 'pending') ? 'My Subscription' : 'Subscription'}
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
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  serviceText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
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
