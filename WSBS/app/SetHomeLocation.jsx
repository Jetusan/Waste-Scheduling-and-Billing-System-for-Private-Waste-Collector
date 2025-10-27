import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking, Platform, Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
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
  const [manualCoords, setManualCoords] = useState({ latitude: '', longitude: '' });
  
  // Map states
  const [mapRef, setMapRef] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Previous location states
  const [previousLocation, setPreviousLocation] = useState(null);
  const [existingGateImage, setExistingGateImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Address state
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Reverse geocode coordinates to get address
  const getAddressFromCoords = useCallback(async (latitude, longitude) => {
    try {
      setLoadingAddress(true);
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (result && result.length > 0) {
        const location = result[0];
        // Build a readable address
        const addressParts = [
          location.street,
          location.district || location.subregion,
          location.city,
          location.region
        ].filter(Boolean);
        
        const formattedAddress = addressParts.join(', ') || 'Address not available';
        setAddress(formattedAddress);
        console.log('📍 Address:', formattedAddress);
      } else {
        setAddress('Address not available');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress('Unable to get address');
    } finally {
      setLoadingAddress(false);
    }
  }, []);

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
      setManualCoords({
        latitude: pos.coords.latitude.toString(),
        longitude: pos.coords.longitude.toString()
      });
      
      // Get address from coordinates
      await getAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
      
      // Send location to map if loaded
      if (mapRef && mapLoaded) {
        sendToMap({ type: 'set_home_location', location: newCoords });
      }
      
      // If this is different from previous location, mark as editing
      if (previousLocation && 
          (Math.abs(newCoords.latitude - previousLocation.latitude) > 0.0001 || 
           Math.abs(newCoords.longitude - previousLocation.longitude) > 0.0001)) {
        setIsEditing(true);
      }
      
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
  }, [getAddressFromCoords]);

  useEffect(() => {
    loadExistingLocation();
    requestPermissionAndLocate();
  }, []);
  
  // Send location to map when both map is ready and we have coordinates
  useEffect(() => {
    if (mapRef && mapLoaded && coords) {
      console.log('🗺️ Sending location to map:', coords);
      sendToMap({ type: 'set_home_location', location: coords });
    }
  }, [mapRef, mapLoaded, coords, sendToMap]);
  
  // Load existing home location if available
  const loadExistingLocation = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/residents/me/home-location`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const locationData = {
            latitude: Number(data.data.latitude),
            longitude: Number(data.data.longitude),
            accuracy: null
          };
          
          setPreviousLocation(locationData);
          setCoords(locationData);
          setManualCoords({
            latitude: locationData.latitude.toString(),
            longitude: locationData.longitude.toString()
          });
          setIsEditing(true);
          
          // Set existing gate image if available
          if (data.data.gate_image_url) {
            setExistingGateImage(data.data.gate_image_url);
          }
          
          console.log('📍 Loaded existing location:', locationData);
        }
      }
    } catch (error) {
      console.error('Error loading existing location:', error);
    }
  };

  const pickImage = async () => {
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

  // Map communication
  const handleMapReady = useCallback((ref) => {
    console.log('🗺️ Map ready for home location setting');
    setMapRef(ref);
  }, []);

  const sendToMap = useCallback((obj) => {
    if (!mapRef || !obj) return;
    try {
      const payload = JSON.stringify(obj)
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\u2028|\u2029/g, '');
      const js = `(() => { try { var ev = new MessageEvent('message', { data: '${payload}' }); window.dispatchEvent(ev); document.dispatchEvent(ev); } catch(e){} })();`;
      if (typeof mapRef.injectJavaScript === 'function') {
        mapRef.injectJavaScript(js);
      } else if (typeof mapRef.postMessage === 'function') {
        mapRef.postMessage(payload);
      }
    } catch (_) { /* noop */ }
  }, [mapRef]);

  const updateManualCoords = () => {
    const lat = parseFloat(manualCoords.latitude);
    const lng = parseFloat(manualCoords.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values.');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Range', 'Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }
    
    const newCoords = {
      latitude: lat,
      longitude: lng,
      accuracy: null
    };
    
    setCoords(newCoords);
    
    // Send to map
    if (mapRef && mapLoaded) {
      sendToMap({ type: 'set_home_location', location: newCoords });
    }
    
    // Mark as editing if coordinates changed
    if (previousLocation && 
        (Math.abs(newCoords.latitude - previousLocation.latitude) > 0.0001 || 
         Math.abs(newCoords.longitude - previousLocation.longitude) > 0.0001)) {
      setIsEditing(true);
    }
  };

  const saveHomeLocation = useCallback(async () => {
    console.log('🔄 Save button pressed');
    console.log('📍 Coords:', coords);
    console.log('🖼️ Gate Image:', gateImage ? 'Selected' : 'Not selected');
    console.log('🖼️ Existing Gate Image:', existingGateImage ? 'Exists' : 'Not exists');
    
    if (!coords) {
      console.log('❌ No coordinates set');
      Alert.alert('Error', 'Please set your location on the map first.');
      return;
    }

    // For new locations, require gate image. For updates, allow keeping existing image
    if (!gateImage && !existingGateImage) {
      console.log('❌ No gate image - showing alert');
      Alert.alert('Gate Image Required', 'Please upload an image of your gate before saving your location.');
      return;
    }

    try {
      console.log('✅ Validation passed - starting save process');
      setBusy(true);
      const token = await getToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please log in to save your home location.');
        return;
      }

      console.log('📤 Uploading to:', `${API_BASE_URL}/api/residents/me/home-location`);
      console.log('📦 Data:', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        hasGateImage: !!gateImage
      });
      
      // Use XMLHttpRequest for file upload (works better than fetch in React Native)
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          console.log('📥 Upload complete - Status:', xhr.status);
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('📄 Response:', response);
              resolve(response);
            } catch (e) {
              resolve({ success: true });
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.message || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => {
          console.error('❌ XHR error');
          reject(new Error('Network error occurred'));
        };
        
        xhr.ontimeout = () => {
          console.error('⏱️ XHR timeout');
          reject(new Error('Upload timed out'));
        };
        
        xhr.open('PUT', `${API_BASE_URL}/api/residents/me/home-location`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 30000; // 30 second timeout
        
        const formData = new FormData();
        formData.append('latitude', coords.latitude.toString());
        formData.append('longitude', coords.longitude.toString());
        
        if (gateImage) {
          const uriParts = gateImage.uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          formData.append('gateImage', {
            uri: gateImage.uri,
            name: `gate-${Date.now()}.${fileType}`,
            type: `image/${fileType}`,
          });
          console.log('📎 Uploading image:', gateImage.uri);
        }
        
        console.log('🌐 Sending XHR request...');
        xhr.send(formData);
      });
      
      await uploadPromise;
      console.log('✅ Save successful!');

      Alert.alert(
        'Success!', 
        isEditing 
          ? 'Your home location has been updated successfully.'
          : 'Your home location and gate image have been saved successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      console.error('❌ Save location error:', e);
      console.error('Error name:', e?.name);
      console.error('Error message:', e?.message);
      
      let msg;
      if (e?.name === 'AbortError') {
        msg = 'Request timed out after 30 seconds. The image might be too large or your connection is slow. Please try again with a smaller image.';
      } else if (e?.message?.includes('Network request failed')) {
        msg = 'Network connection failed. Please check your internet connection and try again.';
      } else {
        msg = e?.message || 'An unexpected error occurred. Please try again.';
      }
      
      Alert.alert('Upload Failed', msg);
    } finally {
      setBusy(false);
    }
  }, [coords, gateImage, existingGateImage, isEditing, router]);

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

      {/* Interactive Map Section */}
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>
          {isEditing ? '🗺️ Update Your Home Location' : '🗺️ Pin Your Home Location'}
        </Text>
        <Text style={styles.mapInstructions}>
          {isEditing 
            ? 'Your previous location is shown • Tap to update • Use 📍 for current location'
            : 'Tap on the map to set your home location • Use 📍 button to find your current location'
          }
        </Text>
        
        {/* Previous Location Info */}
        {isEditing && previousLocation && (
          <View style={styles.previousLocationCard}>
            <View style={styles.previousLocationHeader}>
              <Ionicons name="location" size={16} color="#4CD964" />
              <Text style={styles.previousLocationTitle}>Previous Location</Text>
            </View>
            <Text style={styles.previousLocationCoords}>
              {previousLocation.latitude.toFixed(6)}, {previousLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}
        
        <HomeLocationMapSection 
          onMapReady={handleMapReady} 
          selectedLocation={coords}
          onLocationSelect={async (location) => {
            setCoords(location);
            setManualCoords({
              latitude: location.latitude.toString(),
              longitude: location.longitude.toString()
            });
            // Get address from selected coordinates
            await getAddressFromCoords(location.latitude, location.longitude);
          }}
          onMapLoaded={setMapLoaded}
        />
        
        {/* Display Address */}
        {address && (
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Ionicons name="location" size={20} color="#4CD964" />
              <Text style={styles.addressLabel}>Selected Location:</Text>
            </View>
            {loadingAddress ? (
              <ActivityIndicator size="small" color="#4CD964" style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.addressText}>{address}</Text>
            )}
          </View>
        )}
      </View>

      {/* Gate Image Section */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>
          {isEditing ? '🚪 Update Gate Image' : '🚪 Gate Image'}
        </Text>
        <View style={styles.imageInstructions}>
          <Ionicons name="camera" size={20} color="#FF6B35" />
          <Text style={styles.imageInstructionsText}>
            {isEditing 
              ? 'Upload a new image or keep your existing gate image'
              : 'You must upload an image that shows the front of your gate'
            }
          </Text>
        </View>

        {/* Show existing gate image if available and no new image selected */}
        {!gateImage && existingGateImage && (
          <View style={styles.existingImageContainer}>
            <Text style={styles.existingImageLabel}>Current Gate Image:</Text>
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: `${API_BASE_URL}${existingGateImage}` }} 
                style={styles.imagePreview} 
              />
              <View style={styles.existingImageOverlay}>
                <Text style={styles.existingImageText}>Current</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.changeImageButton} 
              onPress={pickImage}
            >
              <Ionicons name="camera" size={16} color="#007AFF" />
              <Text style={styles.changeImageButtonText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show new selected image */}
        {gateImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: gateImage.uri }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setGateImage(null)}
            >
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ) : !existingGateImage ? (
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            <Ionicons name="camera" size={24} color="#007AFF" />
            <Text style={styles.imagePickerText}>Upload Gate Image</Text>
          </TouchableOpacity>
        ) : null}
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
            (!coords || (!gateImage && !existingGateImage) || busy) && { opacity: 0.5 }
          ]} 
          onPress={saveHomeLocation} 
          disabled={!coords || (!gateImage && !existingGateImage) || busy}
        >
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>
            {busy ? 'Saving...' : isEditing ? 'Update Location' : 'Save Home Location'}
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
  mapInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  coordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  manualInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  coordInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  coordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  updateCoordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  updateCoordsBtnText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  coordsCard: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapWrapper: {
    height: 300,
    width: '100%',
    backgroundColor: '#e6f0ff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0a3d91',
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  previousLocationCard: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CD964',
  },
  previousLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previousLocationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d5a2d',
    marginLeft: 6,
  },
  previousLocationCoords: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#2d5a2d',
    marginLeft: 22,
  },
  addressCard: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5a2d',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  existingImageContainer: {
    marginBottom: 16,
  },
  existingImageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  existingImageOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(76, 217, 100, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  existingImageText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 8,
  },
  changeImageButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  coordText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#2d5a2d',
    fontWeight: '500',
  },
  accuracyText: {
    marginTop: 4,
    color: '#666',
    fontSize: 12,
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

// Home Location Map Component with Dynamic Pin Placement
const HomeLocationMapSection = ({ onMapReady, selectedLocation, onLocationSelect, onMapLoaded }) => {
  const [wvError, setWvError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
        <link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          html, body { background: #e6f0ff; }
          #map { background: #e6f0ff; position: absolute; inset: 0; }
          canvas { background: #e6f0ff !important; display: block; }
          .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { display: none; }
          
          /* Custom My Location Button */
          .my-location-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: #4CD964;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: all 0.2s ease;
          }
          
          .my-location-btn:hover {
            background: #45b359;
            transform: scale(1.05);
          }
          
          .my-location-btn:active {
            transform: scale(0.95);
          }
          
          .my-location-btn.loading {
            background: #ffa726;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let homeMarker;
          
          // Initialize map
          function initMap() {
            try {
              map = new maplibregl.Map({
                container: 'map',
                style: {
                  version: 8,
                  sources: {
                    'osm': {
                      type: 'raster',
                      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                      tileSize: 256,
                      attribution: '© OpenStreetMap contributors'
                    }
                  },
                  layers: [{
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                  }]
                },
                center: [125.1651827, 6.1547981], // General Santos City
                zoom: 13,
                attributionControl: false,
                // Enable smooth scrolling and interactions
                scrollZoom: true,
                boxZoom: true,
                dragRotate: false,
                dragPan: true,
                keyboard: true,
                doubleClickZoom: true,
                touchZoomRotate: true
              });
              
              map.on('load', () => {
                console.log('🗺️ Home location map loaded');
                
                // Add zoom controls
                map.addControl(new maplibregl.NavigationControl({
                  showCompass: false,
                  showZoom: true
                }), 'top-left');
                
                // Add My Location button
                addMyLocationButton();
                
                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map_loaded' }));
                
                // Load previous location if available
                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'load_previous_location' }));
              });
              
              // Handle map clicks for pin placement
              map.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                setHomeLocation({ latitude: lat, longitude: lng });
                
                // Send location back to React Native
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'location_selected',
                  location: { latitude: lat, longitude: lng }
                }));
              });
              
            } catch (error) {
              console.error('Map initialization error:', error);
              window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map_error', error: error.message }));
            }
          }
          
          // Set home location marker
          function setHomeLocation(location) {
            if (!map || !location) return;
            
            try {
              // Remove existing marker
              if (homeMarker) {
                homeMarker.remove();
              }
              
              // Create home marker
              const el = document.createElement('div');
              el.innerHTML = '🏠';
              el.style.fontSize = '24px';
              el.style.cursor = 'pointer';
              
              homeMarker = new maplibregl.Marker({ element: el })
                .setLngLat([location.longitude, location.latitude])
                .addTo(map);
              
              // Center map on location
              map.flyTo({
                center: [location.longitude, location.latitude],
                zoom: 16,
                duration: 1000
              });
              
            } catch (error) {
              console.error('Error setting home location:', error);
            }
          }
          
          // Add My Location button
          function addMyLocationButton() {
            const button = document.createElement('button');
            button.className = 'my-location-btn';
            button.innerHTML = '📍';
            button.title = 'Go to my current location';
            
            button.addEventListener('click', getCurrentLocation);
            document.body.appendChild(button);
          }
          
          // Get user's current location
          function getCurrentLocation() {
            const button = document.querySelector('.my-location-btn');
            if (!button) return;
            
            button.classList.add('loading');
            button.innerHTML = '⏳';
            
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  
                  // Fly to user's current location
                  map.flyTo({
                    center: [longitude, latitude],
                    zoom: 16,
                    duration: 2000
                  });
                  
                  // Send current location to React Native
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                    type: 'current_location_found',
                    location: { latitude, longitude, accuracy: position.coords.accuracy }
                  }));
                  
                  button.classList.remove('loading');
                  button.innerHTML = '📍';
                },
                (error) => {
                  console.error('Geolocation error:', error);
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                    type: 'location_error',
                    error: 'Could not get current location'
                  }));
                  
                  button.classList.remove('loading');
                  button.innerHTML = '❌';
                  setTimeout(() => {
                    button.innerHTML = '📍';
                  }, 2000);
                },
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 60000
                }
              );
            } else {
              window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'location_error',
                error: 'Geolocation not supported'
              }));
              
              button.classList.remove('loading');
              button.innerHTML = '❌';
              setTimeout(() => {
                button.innerHTML = '📍';
              }, 2000);
            }
          }
          
          // Listen for messages from React Native
          window.addEventListener('message', (event) => {
            try {
              const data = JSON.parse(event.data);
              
              switch (data.type) {
                case 'set_home_location':
                  if (data.location) {
                    setHomeLocation(data.location);
                  }
                  break;
                case 'load_previous_location':
                  // Load previous location on map when ready
                  if (window.previousLocationToLoad) {
                    setHomeLocation(window.previousLocationToLoad);
                    window.previousLocationToLoad = null;
                  }
                  break;
                case 'get_current_location':
                  getCurrentLocation();
                  break;
              }
            } catch (error) {
              console.error('Message handling error:', error);
            }
          });
          
          // Initialize when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
          } else {
            initMap();
          }
        </script>
      </body>
    </html>
  `, []);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'map_loaded':
          setLoaded(true);
          onMapLoaded?.(true);
          // Location will be sent by parent component
          break;
        case 'load_previous_location':
          // Location will be sent by parent component
          break;
        case 'location_selected':
          if (data.location && onLocationSelect) {
            onLocationSelect(data.location);
          }
          break;
        case 'current_location_found':
          if (data.location && onLocationSelect) {
            // Update the coordinates when current location is found
            onLocationSelect(data.location);
            console.log('📍 Current location found:', data.location);
          }
          break;
        case 'location_error':
          console.warn('Location error:', data.error);
          // Alert is already imported at the top
          break;
        case 'map_error':
          setWvError(data.error);
          break;
      }
    } catch (error) {
      console.error('Map message parsing error:', error);
    }
  }, [onLocationSelect, onMapLoaded, selectedLocation]);
  
  // Send location to map when it becomes available
  useEffect(() => {
    if (loaded && selectedLocation && onLocationSelect) {
      // Location will be sent via the main component's sendToMap function
      console.log('📍 Map ready with location:', selectedLocation);
    }
  }, [loaded, selectedLocation, onLocationSelect]);

  const onError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('Home Location Map WebView error:', nativeEvent);
    setWvError(nativeEvent?.description || 'Map failed to load');
  }, []);

  return (
    <View style={styles.mapWrapper}>
      {wvError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="warning" size={48} color="#FF6B35" />
          <Text style={{ color: '#FF6B35', textAlign: 'center', marginTop: 8 }}>Map Error: {wvError}</Text>
          <Text style={{ color: '#666', textAlign: 'center', marginTop: 4, fontSize: 12 }}>Please use manual coordinate input below</Text>
        </View>
      ) : (
        <WebView
          ref={onMapReady}
          source={{ html }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          onShouldStartLoadWithRequest={() => true}
          onMessage={onMessage}
          onError={onError}
          onLoadEnd={() => console.log('🗺️ Home location map WebView loaded')}
        />
      )}
      
      {!loaded && !wvError && (
        <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(230, 240, 255, 0.8)' }}>
          <ActivityIndicator size="large" color="#4CD964" />
          <Text style={{ marginTop: 8, color: '#666' }}>Loading Map...</Text>
        </View>
      )}
    </View>
  );
};
