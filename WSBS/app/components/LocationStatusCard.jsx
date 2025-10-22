import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken } from '../auth';
import { API_BASE_URL } from '../config';

const LocationStatusCard = () => {
  const router = useRouter();
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading', 'set', 'not_set', 'error'
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHomeLocation();
  }, []);

  const checkHomeLocation = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setLocationStatus('error');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/residents/me/home-location`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Location data received:', data); // Debug log
        if (data.success && data.data) {
          // Ensure latitude and longitude are numbers
          const locationData = {
            ...data.data,
            latitude: data.data.latitude ? Number(data.data.latitude) : null,
            longitude: data.data.longitude ? Number(data.data.longitude) : null
          };
          setLocationData(locationData);
          setLocationStatus('set');
        } else {
          setLocationStatus('not_set');
        }
      } else if (response.status === 404) {
        // No home location set
        setLocationStatus('not_set');
      } else {
        console.error('Error checking home location:', response.status);
        setLocationStatus('error');
      }
    } catch (error) {
      console.error('Error fetching home location:', error);
      setLocationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetLocation = () => {
    router.push('/SetHomeLocation');
  };

  const handleUpdateLocation = () => {
    Alert.alert(
      'Update Home Location',
      'Do you want to update your home location? This will help collectors find you more accurately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => router.push('/SetHomeLocation') }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4CD964" />
          <Text style={styles.loadingText}>Checking location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons 
          name={locationStatus === 'set' ? 'location' : 'location-outline'} 
          size={24} 
          color={locationStatus === 'set' ? '#4CD964' : '#FF6B6B'} 
        />
        <Text style={styles.title}>Home Location</Text>
      </View>

      {locationStatus === 'set' && locationData ? (
        <View style={styles.locationInfo}>
          <Text style={styles.statusText}>✅ Location Set</Text>
          {locationData.latitude && locationData.longitude ? (
            <Text style={styles.coordsText}>
              📍 {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
            </Text>
          ) : (
            <Text style={styles.coordsText}>
              📍 Location coordinates unavailable
            </Text>
          )}
          {locationData.pinned_at && (
            <Text style={styles.dateText}>
              Set on: {formatDate(locationData.pinned_at)}
            </Text>
          )}
          <TouchableOpacity 
            style={styles.updateButton} 
            onPress={handleUpdateLocation}
          >
            <Ionicons name="refresh-outline" size={16} color="#4CD964" />
            <Text style={styles.updateButtonText}>Update Location</Text>
          </TouchableOpacity>
        </View>
      ) : locationStatus === 'not_set' ? (
        <View style={styles.locationInfo}>
          <Text style={styles.warningText}>⚠️ Location Not Set</Text>
          <Text style={styles.descriptionText}>
            Set your home location to help collectors find you for waste collection.
          </Text>
          <TouchableOpacity 
            style={styles.setButton} 
            onPress={handleSetLocation}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.setButtonText}>Set Home Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.locationInfo}>
          <Text style={styles.errorText}>❌ Unable to check location</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={checkHomeLocation}
          >
            <Ionicons name="refresh-outline" size={16} color="#4CD964" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#4CD964',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  locationInfo: {
    alignItems: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CD964',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  setButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CD964',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  updateButtonText: {
    color: '#4CD964',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryButtonText: {
    color: '#4CD964',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LocationStatusCard;
