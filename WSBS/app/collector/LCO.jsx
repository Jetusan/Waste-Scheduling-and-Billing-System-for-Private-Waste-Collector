import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '../config';
import { getToken, getCollectorId } from '../auth';

const LCO = () => {
  const router = useRouter();
  const [overview, setOverview] = useState({
    total_pickups: 'N/A',
    missed_collections: 'N/A',
    hours_worked: 'N/A',
    distance_covered: 'N/A',
    waste_collected: 'N/A',
    date: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLastCollectionOverview = useCallback(async () => {
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      if (!token || !collectorId) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/collector/last-collection?collector_id=${collectorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setOverview(data.overview);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch overview');
      }
    } catch (err) {
      console.error('Error fetching last collection overview:', err);
      setError('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLastCollectionOverview();
  }, [fetchLastCollectionOverview]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('LCO screen focused - refreshing overview');
      fetchLastCollectionOverview();
    }, [fetchLastCollectionOverview])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLastCollectionOverview();
  }, [fetchLastCollectionOverview]);

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
        {/* Map at the top with back button inside */}
        <ImageBackground
          source={require('../../assets/images/map.png')}
          style={styles.mapBackground}
          imageStyle={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
          resizeMode="cover"
        >
          <TouchableOpacity
            onPress={() => router.push('/collector/CHome')}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
        </ImageBackground>

        {/* Content below map */}
        <View style={styles.content}>
          <Text style={styles.title}>Last Collection&apos;s Overview</Text>

          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.refreshText}>Refresh Stats</Text>
            )}
          </TouchableOpacity>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Pickup:</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={styles.statValue}>{overview.total_pickups}</Text>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Missed Collections:</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={styles.statValue}>{overview.missed_collections}</Text>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Hours Worked:</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={styles.statValue}>{overview.hours_worked} hrs</Text>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Distance:</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={styles.statValue}>{overview.distance_covered} km</Text>
              )}
            </View>
            <View style={styles.statCardLarge}>
              <Text style={styles.statTitle}>Total Waste Collected:</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={styles.statValue}>{overview.waste_collected} kg</Text>
              )}
            </View>
            {overview.date && (
              <View style={styles.dateCard}>
                <Text style={styles.dateText}>Last Collection: {new Date(overview.date).toLocaleDateString()}</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonLightGreen}>
              <Text style={styles.buttonText}>Yesterday&apos;s Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonGreen} onPress={() => router.push('/collector/CSelectBarangay')}>
              <Text style={styles.buttonText}>Start Collections</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default LCO;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mapBackground: {
    height: 200,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 16,
    resizeMode: 'cover',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    color: 'black',
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    borderRadius: 8,
    marginVertical: 8,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    marginTop: 8,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statCardLarge: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statTitle: {
    fontSize: 14,
    color: '#333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  buttonLightGreen: {
    backgroundColor: '#8BC34A',
    flex: 1,
    marginRight: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonGreen: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  dateCard: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dateText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
