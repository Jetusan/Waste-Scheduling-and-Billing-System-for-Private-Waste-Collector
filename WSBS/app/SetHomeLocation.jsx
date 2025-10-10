import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from './auth';
import { API_BASE_URL } from './config';

export default function SetHomeLocation() {
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] = useState(null); // 'granted' | 'denied' | null
  const [coords, setCoords] = useState(null); // { latitude, longitude, accuracy }
  const [busy, setBusy] = useState(false);

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
      
      // Check current permission status first
      const currentPermission = await Location.getForegroundPermissionsAsync();
      
      if (currentPermission.status === 'denied' && currentPermission.canAskAgain === false) {
        // Permission was permanently denied
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
      
      // Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        Alert.alert(
          '📍 Location Permission Required',
          'Location permission is needed to automatically detect and set your home location. Please allow location access when prompted.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: requestPermissionAndLocate },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
        return;
      }
      
      // Check if location services are enabled
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
      
      // Get current location with better accuracy
      const pos = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10
      });
      
      console.log('📍 Location obtained:', pos.coords);
      
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
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

  const saveHomeLocation = useCallback(async () => {
    if (!coords) return;
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please log in to save your home location.');
        return;
      }
      // Timeout controller (12s)
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12000);
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/api/residents/me/home-location`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(t);
      }

      // Try to parse JSON body safely
      let payload = null;
      try { payload = await res.json(); } catch (_) { payload = null; }

      if (!res.ok) {
        const serverMsg = (payload && (payload.message || payload.error)) || 'Failed to save your location.';
        if (res.status === 400) {
          Alert.alert('Invalid data', serverMsg, [
            { text: 'Edit', style: 'default' },
            { text: 'Retry', onPress: () => saveHomeLocation() },
          ]);
          return;
        }
        if (res.status === 401) {
          Alert.alert('Session expired', 'Please log in again to continue.', [
            { text: 'OK' },
          ]);
          return;
        }
        if (res.status === 413) {
          Alert.alert('Request too large', 'The request was too large. Please try again.', [ { text: 'OK' } ]);
          return;
        }
        if (res.status >= 500 && res.status <= 599) {
          Alert.alert('Server error', `${serverMsg}${payload?.details ? `\nDetails: ${payload.details}` : ''}`, [
            { text: 'Retry', onPress: () => saveHomeLocation() },
            { text: 'Cancel', style: 'cancel' },
          ]);
          return;
        }
        // Fallback
        Alert.alert(`Error (${res.status})`, serverMsg, [ { text: 'OK' } ]);
        return;
      }

      Alert.alert('Saved', 'Home location saved successfully.', [
        { text: 'OK', onPress: () => router.replace('/resident/HomePage') },
      ]);
    } catch (e) {
      const msg = e?.name === 'AbortError'
        ? 'Request timed out. Please check your internet and try again.'
        : (e?.message || 'Network error occurred. Please try again.');
      Alert.alert('Network error', msg, [
        { text: 'Retry', onPress: () => saveHomeLocation() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setBusy(false);
    }
  }, [coords, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Home Location</Text>
      <Text style={styles.subtitle}>We will use your current GPS position as your home location.</Text>

      {busy && (
        <ActivityIndicator size="small" color="#4CD964" style={{ marginVertical: 12 }} />
      )}

      {permissionStatus === 'denied' && (
        <Text style={styles.warnText}>Permission denied. Please enable location in Settings and try again.</Text>
      )}

      {coords && (
        <View style={styles.card}>
          <Text style={styles.coordText}>Latitude: {coords.latitude.toFixed(6)}</Text>
          <Text style={styles.coordText}>Longitude: {coords.longitude.toFixed(6)}</Text>
          {typeof coords.accuracy === 'number' && (
            <Text style={styles.accuracyText}>Accuracy: ±{Math.round(coords.accuracy)} m</Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={requestPermissionAndLocate} disabled={busy}>
          <Ionicons name="locate-outline" size={18} color="#333" />
          <Text style={styles.btnSecondaryText}>Refresh Location</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnPrimary, !coords && { opacity: 0.5 }]} onPress={saveHomeLocation} disabled={!coords || busy}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>Save as Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 8,
    color: '#555',
  },
  warnText: {
    color: '#c00',
    marginTop: 8,
  },
  card: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f4f4f4',
  },
  coordText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  accuracyText: {
    marginTop: 4,
    color: '#666',
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnSecondary: {
    backgroundColor: '#eaeaea',
  },
  btnSecondaryText: {
    color: '#333',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#4CD964',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
