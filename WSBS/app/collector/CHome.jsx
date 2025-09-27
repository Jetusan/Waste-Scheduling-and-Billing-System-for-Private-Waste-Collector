import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, ImageBackground, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Fontisto, Feather } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getToken, getCollectorId } from '../auth';


const CHome = () => {
  const router = useRouter();
  const [stats, setStats] = useState({
    today_pickups: 'N/A',
    hours_worked: 'N/A',
    distance_covered: 'N/A',
    waste_collected: 'N/A'
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      if (!token || !collectorId) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/collector/dashboard/stats?collector_id=${collectorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome Collector!</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.notificationIcon}
              onPress={() => router.push('/collector/CNotif')}>
                <Fontisto name="email" size={24} color="black" />
                <View style={styles.notificationDot}/>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notificationIcon, { marginLeft: 16 }]}
                onPress={() => router.push('/CSettings')}
              >
                <Feather name="settings" size={24} color="black" />
              </TouchableOpacity>
            </View>
         </View>



        {/* Background Map (placeholder) */}
                <View style={styles.mapPlaceholder}>
                    <ImageBackground
            source={require('../../assets/images/M.jpg')}
            style={styles.mapPlaceholder}
            imageStyle={{ borderRadius: 8 }}
            resizeMode="cover"
              >
                <View style={{ flex: 1 }} />
              </ImageBackground>
        </View>


        {/* Today’s Pickup Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&#39;s Pickup</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Text style={styles.cardValueGreen}>{stats.today_pickups}</Text>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&#39;s Hour Worked</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Text style={styles.cardValue}>{stats.hours_worked} hrs</Text>
          )}

          <Text style={styles.cardTitle}>Today&#39;s Distance Covered</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Text style={styles.cardValue}>{stats.distance_covered} km</Text>
          )}

          <Text style={styles.cardTitle}>Today&#39;s Waste Collected</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Text style={styles.cardValue}>{stats.waste_collected} kg</Text>
          )}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.buttonGreen} 
        onPress={() => router.push('/collector/LCO')}>
          <Text style={styles.buttonText}>Last Collection&#39;s Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonGreen}
        onPress={() => router.push('/collector/CSchedule')}>
          <Text style={styles.buttonText}>Schedules</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonGreen}
        onPress={() => router.push('/collector/specialpickup')}>
          <Text style={styles.buttonText}>Special Pick Up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonDarkGreen}
        onPress={() => router.push('/collector/CStartCollection')}>
          <Text style={styles.buttonText}>Start Collections</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationIcon: {
  position: 'relative',
  padding: 8,
},
  mailIcon: {
    width: 24,
    height: 24,
  },
 notificationDot: {
  width: 8,
  height: 8,
  backgroundColor: 'red',
  borderRadius: 4,
  position: 'absolute',
  top: 2,
  right: 2,
},
 mapPlaceholder: {
  height: 150,             // increased height for a better banner look
  width: '100%',          
  marginVertical: 12,
  borderRadius: 8,
  overflow: 'hidden',      // clips corners if image overflows
},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2, // Android
    shadowColor: '#000', // iOS
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardValueGreen: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'green',
  },
  buttonGreen: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  buttonDarkGreen: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
