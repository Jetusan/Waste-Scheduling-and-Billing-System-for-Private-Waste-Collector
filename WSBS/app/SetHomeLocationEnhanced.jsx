import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking, Platform, Image, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from './auth';
import { API_BASE_URL } from './config';

export default function SetHomeLocationEnhanced() {
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gateImage, setGateImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const requestPermissionAndLocate = useCallback(async () => {
    try {
      setBusy(true);
      
      const currentPermission = await Location.getForegroundPermissionsAsync();
      
      if (currentPermission.status === 'denied' && currentPermission.canAskAgain === false) {
        Alert.alert(
          '📍 Location Permission Required',
          'Location access is permanently denied. Please enable it in your device settings to set your home location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
        setPermissionStatus('denied');
        return;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        Alert.alert(
          '📍 Location Permission Required',
          'Location permission is needed to automatically detect and set your home location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: requestPermissionAndLocate },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
        return;
      }
      
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          '🛰️ Location Services Required',
          'Please turn on Location Services (GPS) in your device settings and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
        return;
      }
      
      console.log('🔍 Getting current location...');
      
      const pos = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10
      });
      
      console.log('📍 Location obtained:', pos.coords);
      
      const newCoords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      
      setCoords(newCoords);
      setMapRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      
    } catch (e) {
      console.error('❌ Location error:', e);
      Alert.alert(
        '⚠️ Location Error', 
        'Failed to get your location. Please check your GPS settings and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: requestPermissionAndLocate }
        ]
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    requestPermissionAndLocate();
  }, [requestPermissionAndLocate]);

  const pickGateImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera roll permissions are needed to upload gate image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGateImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const onMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setCoords({
      latitude,
      longitude,
      accuracy: null
    });
  };

  const saveHomeLocation = useCallback(async () => {
    if (!coords) {
      Alert.alert('Error', 'Please set your location on the map first.');
      return;
    }

    if (!gateImage) {
      Alert.alert('Gate Image Required', 'Please upload an image of your gate before saving your location.');
      return;
    }

    try {
      setBusy(true);
      const token = await getToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please log in to save your home location.');
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('latitude', coords.latitude.toString());
      formData.append('longitude', coords.longitude.toString());
      
      // Add gate image
      formData.append('gateImage', {
        uri: gateImage.uri,
        type: 'image/jpeg',
        name: 'gate-image.jpg',
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/api/residents/me/home-location`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      let payload = null;
      try { 
        payload = await res.json(); 
      } catch (_) { 
        payload = null; 
      }

      if (!res.ok) {
        const serverMsg = (payload && (payload.message || payload.error)) || 'Failed to save your location.';
        Alert.alert('Error', serverMsg);
        return;
      }

      Alert.alert('Success! 🎉', 'Home location and gate image saved successfully.', [
        { text: 'OK', onPress: () => router.replace('/resident/HomePage') },
      ]);
    } catch (e) {
      const msg = e?.name === 'AbortError'
        ? 'Request timed out. Please check your internet and try again.'
        : (e?.message || 'Network error occurred. Please try again.');
      Alert.alert('Network error', msg);
    } finally {
      setBusy(false);
    }
  }, [coords, gateImage, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Set Home Location</Text>
      
      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Ionicons name="information-circle" size={24} color="#007AFF" />
        <View style={styles.instructionsText}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsSubtitle}>
            1. Drag the pin on the map to your exact home location{'\n'}
            2. Upload an image that shows the front of your gate{'\n'}
            3. Save your location for waste collection
          </Text>
        </View>
      </View>

      {busy && (
        <ActivityIndicator size="small" color="#4CD964" style={{ marginVertical: 12 }} />
      )}

      {permissionStatus === 'denied' && (
        <Text style={styles.warnText}>Permission denied. Please enable location in Settings and try again.</Text>
      )}

      {/* Map Section */}
      {mapRegion && (
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>📍 Pin Your Location</Text>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={onMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {coords && (
              <Marker
                coordinate={coords}
                draggable={true}
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setCoords({ latitude, longitude, accuracy: null });
                }}
                title="Your Home"
                description="Drag me to your exact location"
              />
            )}
          </MapView>
          {coords && (
            <View style={styles.coordsCard}>
              <Text style={styles.coordText}>📍 Lat: {coords.latitude.toFixed(6)}</Text>
              <Text style={styles.coordText}>📍 Lng: {coords.longitude.toFixed(6)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Gate Image Section */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>🚪 Gate Image</Text>
        <View style={styles.imageInstructions}>
          <Ionicons name="camera" size={20} color="#FF6B35" />
          <Text style={styles.imageInstructionsText}>
            You must upload an image that shows the front of your gate
          </Text>
        </View>
        
        {gateImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: gateImage.uri }} style={styles.imagePreview} />
            <Pressable onPress={() => setGateImage(null)} style={styles.removeImageButton}>
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.imagePickerButton} onPress={pickGateImage}>
            <Ionicons name="camera-outline" size={24} color="#007AFF" />
            <Text style={styles.imagePickerText}>Upload Gate Image</Text>
          </Pressable>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable 
          style={[styles.btn, styles.btnSecondary]} 
          onPress={requestPermissionAndLocate} 
          disabled={busy}
        >
          <Ionicons name="locate-outline" size={18} color="#333" />
          <Text style={styles.btnSecondaryText}>Refresh Location</Text>
        </Pressable>
        
        <Pressable 
          style={[
            styles.btn, 
            styles.btnPrimary, 
            (!coords || !gateImage || busy) && { opacity: 0.5 }
          ]} 
          onPress={saveHomeLocation} 
          disabled={!coords || !gateImage || busy}
        >
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>
            {busy ? 'Saving...' : 'Save Home Location'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  instructionsSubtitle: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  warnText: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  mapContainer: {
    marginBottom: 24,
  },
  map: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coordsCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  coordText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
  },
  imageSection: {
    marginBottom: 24,
  },
  imageInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  imageInstructionsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#e65100',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnSecondaryText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  btnPrimary: {
    backgroundColor: '#4CD964',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
