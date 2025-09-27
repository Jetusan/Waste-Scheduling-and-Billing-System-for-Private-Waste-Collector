import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getToken, getCollectorId } from '../auth';

const CSchedule = () => {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSchedules = useCallback(async () => {
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      if (!token || !collectorId) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/collector/schedules?collector_id=${collectorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSchedules(data.schedules);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch schedules');
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules();
  }, [fetchSchedules]);

  // Filter by search text (optional)
  const filteredSchedules = schedules.filter((item) =>
    item.location.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Waste Collection Schedule</Text>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search schedules..."
          value={searchText}
          onChangeText={setSearchText}
          style={{ flex: 1 }}
        />
      </View>

      {/* Schedule List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading schedules...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSchedules}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredSchedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Schedules Found</Text>
            <Text style={styles.emptyText}>You don't have any schedules assigned yet.</Text>
          </View>
        ) : (
          filteredSchedules.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.id}</Text>
              <View style={styles.scheduleInfo}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.scheduleText}>{item.location}</Text>
              </View>
              {item.waste_type && (
                <View style={styles.scheduleInfo}>
                  <Ionicons name="trash-outline" size={16} color="#666" />
                  <Text style={styles.scheduleText}>{item.waste_type}</Text>
                </View>
              )}
              {item.day && (
                <View style={styles.scheduleInfo}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.scheduleText}>{item.day}</Text>
                </View>
              )}
              <View style={styles.scheduleInfo}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.scheduleText}>{item.time}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default CSchedule;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#007bff',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
