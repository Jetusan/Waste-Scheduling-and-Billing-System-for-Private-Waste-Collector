import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getToken, getUserId } from '../auth';
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
  const fetchSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      const token = await getToken();
      const userId = await getUserId();
      if (!token || !userId) {
        console.log('🔄 No token or userId, setting status to none');
        setSubscriptionStatus('none');
        setSubscriptionLoading(false);
        return;
      }
      
      console.log('🔄 Fetching subscription status for userId:', userId);
      const res = await fetch(`${API_BASE_URL}/api/billing/subscription-status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('🔄 Subscription API response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('🔄 Subscription API response data:', JSON.stringify(data, null, 2));
        
        // Handle different response formats
        let status = 'none';
        
        if (data.subscription && data.subscription.status) {
          status = data.subscription.status;
        } else if (data.status) {
          status = data.status;
        } else if (data.has_subscription === true) {
          status = 'active'; // Assume active if has_subscription is true
        } else if (data.has_subscription === false) {
          status = 'none';
        }
        
        console.log('🔄 Final subscription status:', status);
        setSubscriptionStatus(status);
      } else {
        console.log('🔄 Subscription API failed, setting status to none');
        setSubscriptionStatus('none');
      }
    } catch (error) {
      console.error('🔄 Subscription status fetch error:', error);
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
        <Text style={styles.welcomeText}>
          {userName ? `Welcome, ${userName}` : 'Welcome'}
        </Text>
        {/* Debug info - remove in production */}
        <Text style={styles.debugText}>
          Status: {subscriptionStatus || 'loading...'}
        </Text>
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

        {/* Services Section - Only 3 Main Buttons */}
        <Text style={styles.servicesTitle}>Choose your services</Text>
        <View style={styles.servicesContainer}>
          {/* Collection Schedule - Use previous route */}
          <Pressable 
            style={styles.serviceButton}
            onPress={() => router.push('/AllSchedules')}
          >
            <Ionicons name="calendar-outline" size={32} color="#4CD964" />
            <Text style={styles.serviceText}>Collection Schedule</Text>
          </Pressable>

          {/* Special Pickup - Use previous route */}
          <Pressable 
            style={styles.serviceButton}
            onPress={() => router.push('/spickup')}
          >
            <Ionicons name="add-circle-outline" size={32} color="#4CD964" />
            <Text style={styles.serviceText}>Special Pickup</Text>
          </Pressable>

          {/* My Subscription - Keep same logic as previous */}
          <Pressable 
            style={styles.serviceButton}
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
    paddingTop: 50,
    paddingBottom: 20,
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
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  settingsIcon: {
    padding: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  daysRowOuter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    marginVertical: 20,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  dayTextOuter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    textAlign: 'center',
    minWidth: 40,
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
  debugText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
});
