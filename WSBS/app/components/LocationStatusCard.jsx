import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken } from '../auth';
import { API_BASE_URL } from '../config';

const LocationStatusCard = () => {
  const router = useRouter();
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading', 'set', 'not_set', 'error'
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => {
        if (locationStatus === 'set') {
          setShowDetails(!showDetails);
        } else if (locationStatus === 'not_set') {
          handleSetLocation();
        } else if (locationStatus === 'error') {
          checkHomeLocation();
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.compactHeader}>
        <View style={styles.leftSection}>
          <Ionicons 
            name={locationStatus === 'set' ? 'location' : locationStatus === 'not_set' ? 'location-outline' : 'alert-circle-outline'} 
            size={20} 
            color={locationStatus === 'set' ? '#4CD964' : locationStatus === 'not_set' ? '#FF9800' : '#FF6B6B'} 
          />
          <Text style={styles.compactTitle}>Home Location</Text>
        </View>
        
        <View style={styles.rightSection}>
          {locationStatus === 'set' ? (
            <View style={styles.statusIndicator}>
              <Ionicons name="checkmark-circle" size={18} color="#4CD964" />
              {showDetails && (
                <Ionicons name="chevron-up" size={16} color="#666" style={{ marginLeft: 4 }} />
              )}
              {!showDetails && (
                <Ionicons name="chevron-down" size={16} color="#666" style={{ marginLeft: 4 }} />
              )}
            </View>
          ) : locationStatus === 'not_set' ? (
            <View style={styles.statusIndicator}>
              <Text style={styles.actionText}>Tap to set</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF9800" style={{ marginLeft: 4 }} />
            </View>
          ) : (
            <View style={styles.statusIndicator}>
              <Text style={styles.errorActionText}>Tap to retry</Text>
              <Ionicons name="refresh" size={16} color="#FF6B6B" style={{ marginLeft: 4 }} />
            </View>
          )}
        </View>
      </View>

      {/* Expandable Details - Only show when location is set and details are expanded */}
      {locationStatus === 'set' && showDetails && locationData && (
        <View style={styles.expandedDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="pin" size={14} color="#666" />
            <Text style={styles.detailLabel}>Coordinates:</Text>
          </View>
          {locationData.latitude && locationData.longitude ? (
            <Text style={styles.coordsText}>
              {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
            </Text>
          ) : (
            <Text style={styles.coordsText}>Coordinates unavailable</Text>
          )}
          
          {locationData.pinned_at && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="time" size={14} color="#666" />
                <Text style={styles.detailLabel}>Set on:</Text>
              </View>
              <Text style={styles.dateText}>{formatDate(locationData.pinned_at)}</Text>
            </>
          )}
          
          {/* Gate Image Display */}
          {locationData.gate_image_url && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="camera" size={14} color="#666" />
                <Text style={styles.detailLabel}>Gate Image:</Text>
              </View>
              <View style={styles.gateImageContainer}>
                <Image 
                  source={{ uri: `${API_BASE_URL}${locationData.gate_image_url}` }}
                  style={styles.gateImage}
                  resizeMode="cover"
                />
                <Text style={styles.gateImageCaption}>Your uploaded gate image</Text>
              </View>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.updateButton} 
            onPress={(e) => {
              e.stopPropagation();
              handleUpdateLocation();
            }}
          >
            <Ionicons name="refresh-outline" size={14} color="#4CD964" />
            <Text style={styles.updateButtonText}>Update Location</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  errorActionText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 6,
  },
  coordsText: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 8,
    marginLeft: 20,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    marginLeft: 20,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  updateButtonText: {
    color: '#4CD964',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  gateImageContainer: {
    marginLeft: 20,
    marginBottom: 8,
  },
  gateImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  gateImageCaption: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default LocationStatusCard;
