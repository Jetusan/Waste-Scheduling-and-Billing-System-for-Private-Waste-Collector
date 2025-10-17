import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken, getUserId } from '../auth';
import { API_BASE_URL } from '../config';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userBarangay, setUserBarangay] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // null=unknown, 'active', 'pending', 'none'

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

  useEffect(() => {
    // Check subscription status - Keep the same logic as previous
    const fetchSubscriptionStatus = async () => {
      try {
        const token = await getToken();
        const userId = await getUserId();
        if (!token || !userId) {
          setSubscriptionStatus('none');
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/billing/subscription/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.subscription && data.subscription.status) {
            setSubscriptionStatus(data.subscription.status);
          } else {
            setSubscriptionStatus('none');
          }
        } else {
          setSubscriptionStatus('none');
        }
      } catch (_err) {
        setSubscriptionStatus('none');
      }
    };
    fetchSubscriptionStatus();
  }, []);

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
        <Image
          style={styles.profileImage}
          source={{ uri: 'https://via.placeholder.com/50' }} // Replace with actual image URL
        />
        <Ionicons
          name="settings-outline"
          size={28}
          color="#FFFFFF"
          style={styles.settingsIcon}
          onPress={() => router.push('/SetHomeLocation')}
        />
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
              {subscriptionStatus === 'active' ? 'My Subscription' : 'Subscriptions'}
            </Text>
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
});
