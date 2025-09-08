import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken } from '../auth';
import { API_BASE_URL } from '../config';

export default function HomePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBarangay, setUserBarangay] = useState('');
  const [hasHomeLocation, setHasHomeLocation] = useState(null); // null=unknown, true/false once fetched
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // null=unknown, 'active', 'pending', 'none'

  useEffect(() => {
    // Fetch schedules
    const fetchSchedules = async () => {
      try {
        console.log('🔥 Fetching schedules from:', `${API_BASE_URL}/api/collection-schedules`);
        const res = await fetch(`${API_BASE_URL}/api/collection-schedules`);
        if (!res.ok) throw new Error('Failed to fetch schedules');
        const data = await res.json();
        console.log('🔥 Raw schedules data:', JSON.stringify(data, null, 2));
        setSchedules(data);
      } catch (err) {
        console.error('🔥 Error fetching schedules:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

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
        console.log('🔥 User profile response:', JSON.stringify(data, null, 2)); // <-- Enhanced log
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
          setUserBarangay(barangay_name || ''); // <-- Use barangay_name
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
    // Check if user has a pinned home location
    const fetchHomeLocation = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setHasHomeLocation(false);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/residents/me/home-location`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          setHasHomeLocation(false);
          return;
        }
        if (!res.ok) {
          // Keep it unknown on transient errors
          setHasHomeLocation(null);
          return;
        }
        setHasHomeLocation(true);
      } catch {
        setHasHomeLocation(null);
      }
    };
    fetchHomeLocation();
  }, []);

  useEffect(() => {
    // Check user's subscription status
    const fetchSubscriptionStatus = async () => {
      console.log('🔥 Starting subscription status check...');
      try {
        const token = await getToken();
        console.log('🔥 Token check result:', token ? 'Token found' : 'No token');
        if (!token) {
          console.log('🔥 No token found, setting status to none');
          setSubscriptionStatus('none');
          return;
        }
        
        // Get user profile to extract user_id from JWT
        const profileResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!profileResponse.ok) {
          console.log('🔥 Failed to get user profile, setting status to none');
          setSubscriptionStatus('none');
          return;
        }
        
        const profileData = await profileResponse.json();
        // Support different id keys from profile API
        const userId = profileData.user?.user_id ?? profileData.user?.id ?? profileData.user?.userId;
        if (!userId) {
          console.log('🔥 No user_id/id/userId found in profile, setting status to none');
          setSubscriptionStatus('none');
          return;
        }
        
        // Call subscription API with actual user_id
        const subscriptionUrl = `${API_BASE_URL}/api/billing/subscription-status/${userId}`;
        console.log('🔥 Calling subscription API for user_id:', userId, 'URL:', subscriptionUrl);
        
        const res = await fetch(subscriptionUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('🔥 Subscription API response status:', res.status);
        
        if (res.status === 404) {
          console.log('🔥 404 - No subscription found');
          setSubscriptionStatus('none');
          return;
        }
        if (!res.ok) {
          console.log('🔥 API request failed with status:', res.status);
          setSubscriptionStatus('none');
          return;
        }
        
        const data = await res.json();
        console.log('🔥 Subscription API Response:', JSON.stringify(data, null, 2));
        
        // Normalize response across two possible backend controllers
        const hasSub = (data.has_subscription !== undefined) ? data.has_subscription : data.hasSubscription;
        const uiState = data.uiState; // from subscriptionStatusController
        const sub = data.subscription || null;

        if (hasSub && sub) {
          const status = sub.status;
          // Support both snake_case and camelCase payment status keys
          const payStatus = sub.payment_status ?? sub.paymentStatus;

          console.log('🔥 Normalized subscription:', { status, payStatus, uiState });

          // Prefer uiState when available
          if (uiState === 'active' || (status === 'active' && payStatus === 'paid')) {
            console.log('🔥 Setting subscription status to ACTIVE');
            setSubscriptionStatus('active');
          } else if (uiState?.startsWith('pending') || status === 'pending_payment') {
            console.log('🔥 Setting subscription status to PENDING');
            setSubscriptionStatus('pending');
          } else {
            console.log('🔥 Setting subscription status to NONE (unknown status)');
            setSubscriptionStatus('none');
          }
        } else if (hasSub === false) {
          console.log('🔥 API reports no subscription for user');
          setSubscriptionStatus('none');
        } else {
          console.log('🔥 No subscription found in response, setting to NONE');
          setSubscriptionStatus('none');
        }
      } catch (error) {
        console.log('🔥 Error in fetchSubscriptionStatus:', error.message);
        console.log('🔥 Error stack:', error.stack);
        setSubscriptionStatus('none');
      }
    };
    
    // Add a small delay to ensure component is mounted
    setTimeout(() => {
      fetchSubscriptionStatus();
    }, 1000);
  }, []);

  useEffect(() => {
    console.log('🔥 User barangay changed to:', userBarangay);
  }, [userBarangay]);

  useEffect(() => {
    console.log('🔥 Current subscriptionStatus state:', subscriptionStatus);
  }, [subscriptionStatus]);

  // Filter schedules for this resident's barangay (RESTORED)
  const filteredSchedules = schedules.filter(evt =>
    evt.barangays &&
    evt.barangays.some(b => b.barangay_name === userBarangay)
  );
  console.log('🔥 All schedules:', schedules.length);
  console.log('🔥 User barangay for filtering:', userBarangay);
  console.log('🔥 Filtered schedules:', filteredSchedules.length);

  // Get today's day name (e.g., 'Saturday')
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Find schedules for today for this barangay
  const getTodaySchedules = () => {
    return filteredSchedules.filter(evt =>
      evt.schedule_date &&
      evt.schedule_date.trim().toLowerCase() === todayDayName.trim().toLowerCase()
    );
  };

  const todaySchedules = getTodaySchedules();

  // Find the next upcoming schedule(s) for this barangay (including today if there's a schedule)
  const getUpcomingSchedules = () => {
    // Define the order of days in a week
    const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const todayDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Sort schedules by day priority (today first, then next days)
    return filteredSchedules.sort((a, b) => {
      const aDayIndex = daysOrder.findIndex(day => 
        day.toLowerCase() === a.schedule_date?.trim().toLowerCase()
      );
      const bDayIndex = daysOrder.findIndex(day => 
        day.toLowerCase() === b.schedule_date?.trim().toLowerCase()
      );

      // Calculate days from today (0 = today, 1 = tomorrow, etc.)
      const aDaysFromToday = aDayIndex >= todayDayIndex ? aDayIndex - todayDayIndex : (7 + aDayIndex - todayDayIndex);
      const bDaysFromToday = bDayIndex >= todayDayIndex ? bDayIndex - todayDayIndex : (7 + bDayIndex - todayDayIndex);

      return aDaysFromToday - bDaysFromToday;
    });
  };

  const upcomingSchedules = getUpcomingSchedules().slice(0, 3); // Show up to 3 upcoming

  console.log('🔥 Today is:', todayDayName);
  console.log('🔥 Today schedules for user barangay:', todaySchedules.length);
  console.log('🔥 Upcoming schedules:', upcomingSchedules.length);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = new Date().getDay(); // 0 (Sun) - 6 (Sat)
  // Our daysOfWeek starts with Mon, so adjust index: JS Sun=0, Mon=1, ..., Sat=6
  const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

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
          color="black"
          style={styles.settingsIcon}
          onPress={() => router.push('/SetHomeLocation')}
        />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Days of the week row (outside the schedule box) */}
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

      {/* Upcoming Schedule Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.servicesTitle}>Upcoming Collection Schedule</Text>
        {/* Inline prompt: show only if user has no pinned home location */}
        {!loading && !error && hasHomeLocation === false && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Set your home location to get accurate collection schedules</Text>
            <Text style={styles.locationSubtitle}>Please pin your location so we can show schedules for your area.</Text>
            <Pressable style={styles.ctaButton} onPress={() => router.push('/SetHomeLocation')}>
              <Ionicons name="location-outline" size={18} color="#fff" />
              <Text style={styles.ctaText}>Set Home Location</Text>
            </Pressable>
          </View>
        )}
        {loading ? (
          <ActivityIndicator size="small" color="#4CD964" style={{ marginVertical: 10 }} />
        ) : error ? (
          <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
        ) : filteredSchedules.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888' }}>No collection schedule found for your barangay.</Text>
        ) : upcomingSchedules.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888' }}>No upcoming schedules available.</Text>
        ) : (
          upcomingSchedules.map((evt, index) => {
            // Determine if this schedule is for today
            const isToday = evt.schedule_date?.trim().toLowerCase() === todayDayName.trim().toLowerCase();
            
            return (
              <View key={`${evt.schedule_id}-${index}`} style={[
                styles.eventCard,
                isToday && { borderColor: '#4CD964', borderWidth: 2, backgroundColor: '#f0fff4' }
              ]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.eventTitle, isToday && { color: '#4CD964', fontWeight: 'bold' }]}>
                    {evt.schedule_date}
                    {isToday && ' (Today)'}
                  </Text>
                  {evt.time_range && (
                    <Text style={[styles.timeText, isToday && { color: '#4CD964', fontWeight: 'bold' }]}>
                      {evt.time_range}
                    </Text>
                  )}
                </View>
                <Text style={styles.eventLocation}>
                  Barangay: {evt.barangays.map(b => b.barangay_name).join(', ')}
                </Text>
                <Text style={styles.eventLocation}>
                  Waste Type: {evt.waste_type || 'Not specified'}
                </Text>
                {/* Add a status indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                  <View style={[
                    styles.statusDot, 
                    isToday ? { backgroundColor: '#4CD964' } : { backgroundColor: '#FFA500' }
                  ]} />
                  <Text style={[styles.statusText, isToday && { color: '#4CD964' }]}>
                    {isToday ? 'Collection Today' : 'Upcoming Collection'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Services Section */}
      <Text style={styles.servicesTitle}>Choose your services</Text>
      <View style={styles.servicesContainer}>
        {/* Removed Schedule button */}
        <Pressable 
          style={styles.serviceButton}
          onPress={() => router.push('/spickup')}
        >
          <Ionicons name="add-circle-outline" size={32} color="#4CD964" />
          <Text style={styles.serviceText}>Special Pickup</Text>
        </Pressable>
        <Pressable 
            style={styles.serviceButton}
            onPress={() => {
              // Navigate based on subscription status
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

      {/* Bottom Navigation */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Add some padding at the bottom for better UX
  },
  header: {
    backgroundColor: '#4CD964',
    paddingVertical: 25,
    paddingLeft: 5,
    paddingRight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24, // Add space below the top of the header
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  settingsIcon: {
    marginLeft: 1,
    alignSelf: 'center',
    // You can add marginRight or adjust marginLeft as needed for free movement
  },
  scheduleSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  servicesTitle: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  servicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20, // Reduced from 400 to reasonable spacing
  },
  serviceButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5, // for Android
    width: 100,
  },
  serviceText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  eventLocation: {
    marginTop: 2,
    color: '#666',
    fontSize: 13,
  },
  timeText: {
    fontSize: 12,
    color: '#4CD964',
    fontWeight: '600',
    backgroundColor: '#f0fff4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  locationCard: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  locationSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#047857',
  },
  ctaButton: {
    marginTop: 10,
    backgroundColor: '#4CD964',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },
  seeAllBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    padding: 4,
  },
  seeAllText: {
    color: '#4CD964',
    fontWeight: '600',
    fontSize: 13,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 4,
    paddingHorizontal: 4,
  },
  dayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#4CD964',
    fontWeight: '600',
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F0FDF4',
    marginHorizontal: 1,
  },
  daysRowOuter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    marginHorizontal: 10,
    paddingHorizontal: 2,
  },
  dayTextOuter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: '#388E3C',
    fontWeight: 'bold',
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
    marginHorizontal: 2,
    elevation: 1,
  },
});
