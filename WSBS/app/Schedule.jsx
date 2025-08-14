import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from './config';
import { getToken } from './auth';

export default function Schedule() {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBarangay, setUserBarangay] = useState('');

  useEffect(() => {
    // Fetch user profile for barangay
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
        if (response.ok && data.success && data.user) {
          setUserBarangay(data.user.barangay || '');
        }
      } catch (err) {
        // Ignore error
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/collection-schedules`);
        if (!res.ok) throw new Error('Failed to fetch schedules');
        const data = await res.json();
        setSchedules(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  // Filter schedules for this resident's barangay
  const filteredSchedules = schedules.filter(evt =>
    evt.barangays &&
    evt.barangays.some(b => b.barangay_name === userBarangay)
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/resident/HomePage')}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Loading/Error State */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#4CAF50" /></View>
      ) : error ? (
        <View style={styles.centered}><Text style={{ color: 'red' }}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.eventsList}>
          {filteredSchedules.length === 0 ? (
            <Text style={styles.noData}>No schedules found.</Text>
          ) : (
            filteredSchedules.map(evt => (
              <View key={evt.schedule_id} style={styles.eventCard}>
                <View style={styles.eventDetail}>
                  <Text style={styles.eventTitle}>{evt.schedule_date} {evt.schedule_time}</Text>
                  <Text style={styles.eventLocation}>
                    Barangay: {evt.barangays.map(b => b.barangay_name).join(', ')}
                  </Text>
                  <Text style={styles.eventLocation}>
                    Waste Type: {evt.waste_type}
                  </Text>
                  {/* Add truck/collector if you want */}
                  {/* <Text style={styles.eventLocation}>Truck: {evt.truck_number} {evt.driver_name ? `(${evt.driver_name})` : ''}</Text> */}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    padding: 20,
    paddingBottom: 15,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  eventsList: { padding: 20 },
  eventCard: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  eventDetail: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  eventLocation: { marginTop: 4, color: '#666' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  noData: { textAlign: 'center', color: '#888', marginTop: 30 },
});
