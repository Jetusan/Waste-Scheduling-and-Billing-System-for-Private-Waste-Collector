import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from './auth';
import { API_BASE_URL } from './config';

export default function CollectionSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [userBarangay, setUserBarangay] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Fetch schedules (public)
      const schRes = await fetch(`${API_BASE_URL}/api/collection-schedules`);
      if (!schRes.ok) throw new Error('Failed to fetch schedules');
      const schData = await schRes.json();

      // 2) Fetch profile to know user's barangay
      const token = await getToken();
      let barangay = '';
      if (token) {
        const profRes = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profRes.ok) {
          const prof = await profRes.json();
          barangay = prof?.user?.barangay_name || '';
        }
      }

      setSchedules(schData || []);
      setUserBarangay(barangay);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const todayDayName = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);

  const filtered = useMemo(() => {
    return (schedules || []).filter(evt =>
      evt.barangays && evt.barangays.some(b => b.barangay_name === userBarangay)
    );
  }, [schedules, userBarangay]);

  const todayList = useMemo(() => filtered.filter(evt =>
    evt.schedule_date && evt.schedule_date.trim().toLowerCase() === todayDayName.trim().toLowerCase()
  ), [filtered, todayDayName]);

  const upcoming = useMemo(() => {
    const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIdx = new Date().getDay();
    return [...filtered]
      .sort((a, b) => {
        const ai = daysOrder.findIndex(d => d.toLowerCase() === (a.schedule_date || '').trim().toLowerCase());
        const bi = daysOrder.findIndex(d => d.toLowerCase() === (b.schedule_date || '').trim().toLowerCase());
        const ad = ai >= todayIdx ? ai - todayIdx : 7 + ai - todayIdx;
        const bd = bi >= todayIdx ? bi - todayIdx : 7 + bi - todayIdx;
        return ad - bd;
      })
      .slice(0, 6);
  }, [filtered]);

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Ionicons name="calendar" size={22} color="#fff" />
        <Text style={styles.headerTitle}>Collection Schedule</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#4CD964" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No collection schedule found for your barangay.</Text>
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>Today</Text>
          {todayList.length === 0 ? (
            <Text style={styles.dim}>No collection today.</Text>
          ) : todayList.map((evt, i) => (
            <View key={`${evt.schedule_id}-today-${i}`} style={[styles.card, { borderColor: '#4CD964', borderWidth: 2, backgroundColor: '#f0fff4' }]}>
              <Text style={[styles.cardTitle, { color: '#4CD964' }]}>{evt.schedule_date} (Today)</Text>
              {evt.time_range && <Text style={styles.meta}>Time: {evt.time_range}</Text>}
              <Text style={styles.meta}>Barangay: {evt.barangays.map(b => b.barangay_name).join(', ')}</Text>
              <Text style={styles.meta}>Waste Type: {evt.waste_type || 'Not specified'}</Text>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Upcoming</Text>
          {upcoming.map((evt, i) => (
            <View key={`${evt.schedule_id}-up-${i}`} style={styles.card}>
              <Text style={styles.cardTitle}>{evt.schedule_date}</Text>
              {evt.time_range && <Text style={styles.meta}>Time: {evt.time_range}</Text>}
              <Text style={styles.meta}>Barangay: {evt.barangays.map(b => b.barangay_name).join(', ')}</Text>
              <Text style={styles.meta}>Waste Type: {evt.waste_type || 'Not specified'}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#4CD964', padding: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  meta: { marginTop: 4, color: '#666', fontSize: 13 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20 },
  dim: { color: '#777', fontStyle: 'italic' },
});
