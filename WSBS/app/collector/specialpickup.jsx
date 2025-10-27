import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image, ActivityIndicator, Alert, RefreshControl, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { API_BASE_URL } from '../config';
import { getUserId, getCollectorId } from '../auth';

const SpecialPickup = () => {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [collectorId, setCollectorId] = useState(null);
  
  // Map states
  const [mapRef, setMapRef] = useState(null);
  const [collectorLocation, setCollectorLocation] = useState(null);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState(null);

  const loadRequests = useCallback(async (cid) => {
    const idToUse = cid ?? collectorId;
    if (!idToUse) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/special-pickup/collector/${idToUse}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch requests');
      // Filter to show only in_progress requests
      const inProgressRequests = data.filter(req => req.status === 'in_progress');
      setRequests(inProgressRequests);
    } catch (err) {
      setError(err.message);
    }
  }, [API_BASE_URL, collectorId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const id = await getCollectorId();
        setCollectorId(id);
        await loadRequests(id);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  // Map functionality
  const handleMapReady = useCallback((ref) => {
    setMapRef(ref);
  }, []);

  // Send messages to the WebView map
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

  // Get collector's current location
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isMounted) return;
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCollectorLocation(loc);
        if (mapRef && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
          sendToMap({ type: 'set_collector_location', location: loc });
        }
      } catch (_) {
        // ignore location errors
      }
    })();
    return () => { isMounted = false; };
  }, [mapRef, sendToMap]);

  // Push pickup locations to map when requests change
  useEffect(() => {
    if (!mapRef || !requests || requests.length === 0) return;
    
    const pickupMarkers = requests
      .filter(req => req.pickup_latitude && req.pickup_longitude)
      .map(req => ({
        latitude: Number(req.pickup_latitude),
        longitude: Number(req.pickup_longitude),
        name: `${req.waste_type} Pickup`,
        address: req.address || '',
        request_id: req.request_id,
        waste_type: req.waste_type,
        final_price: req.final_price
      }))
      .filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude));
    
    if (pickupMarkers.length > 0) {
      sendToMap({ type: 'set_pickup_markers', markers: pickupMarkers });
    }
  }, [mapRef, requests, sendToMap]);

  // Show specific pickup on map
  const showPickupOnMap = useCallback((request) => {
    if (!request.pickup_latitude || !request.pickup_longitude || !mapRef) {
      Alert.alert(
        'Location Not Available',
        'GPS coordinates are not available for this pickup request.',
        [{ text: 'OK' }]
      );
      return;
    }

    const location = {
      latitude: Number(request.pickup_latitude),
      longitude: Number(request.pickup_longitude),
      name: `${request.waste_type} Pickup`,
      address: request.address,
      request_id: request.request_id,
      waste_type: request.waste_type,
      final_price: request.final_price
    };

    setSelectedPickupLocation(location);
    
    // Send location to map
    sendToMap({
      type: 'show_pickup_location',
      location: location
    });
    
    // Draw route from collector to pickup if collector location is available
    if (collectorLocation) {
      sendToMap({
        type: 'draw_route',
        from: {
          latitude: collectorLocation.latitude,
          longitude: collectorLocation.longitude
        },
        to: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
    }
  }, [mapRef, collectorLocation, sendToMap]);

  // Center map on collector location
  const centerOnCollector = useCallback(() => {
    if (collectorLocation && mapRef) {
      sendToMap({
        type: 'center_on_collector',
        location: {
          latitude: collectorLocation.latitude,
          longitude: collectorLocation.longitude
        }
      });
    } else {
      Alert.alert('Location Unavailable', 'Collector location is not available yet.');
    }
  }, [collectorLocation, mapRef, sendToMap]);

  const markAsCollected = async (requestId) => {
    Alert.alert(
      'Confirm Collection',
      'Are you sure you want to mark this pickup as collected?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              // Remove from list immediately (optimistic update)
              setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
              
              const res = await fetch(`${API_BASE_URL}/api/special-pickup/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'collected', collector_id: collectorId })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Failed to update request');
              
              Alert.alert('Success', 'Pickup marked as collected successfully!');
            } catch (e) {
              Alert.alert('Update Failed', e.message || 'Could not mark as collected');
              // rollback by reloading
              await loadRequests();
            }
          }
        }
      ]
    );
  };

  const markAsMissed = async (requestId) => {
    Alert.alert(
      'Mark as Missed',
      'Are you sure you want to mark this pickup as missed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark Missed', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from list immediately (optimistic update)
              setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
              
              const res = await fetch(`${API_BASE_URL}/api/special-pickup/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'missed', collector_id: collectorId })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Failed to update request');
              
              Alert.alert('Success', 'Pickup marked as missed.');
            } catch (e) {
              Alert.alert('Update Failed', e.message || 'Could not mark as missed');
              // rollback by reloading
              await loadRequests();
            }
          }
        }
      ]
    );
  };

  const startNavigation = (request) => {
    const { address, pickup_latitude, pickup_longitude } = request;
    
    // If GPS coordinates are available, show on integrated map first
    if (pickup_latitude && pickup_longitude) {
      // First show on the integrated map
      showPickupOnMap(request);
      
      // Then ask if they want external navigation
      Alert.alert(
        'Navigation Options',
        `Location shown on map above.\n\nGPS: ${parseFloat(pickup_latitude).toFixed(6)}, ${parseFloat(pickup_longitude).toFixed(6)}\nAddress: ${address}`,
        [
          { text: 'Stay on Map', style: 'cancel' },
          { 
            text: 'Open External Maps', 
            onPress: () => {
              const lat = parseFloat(pickup_latitude);
              const lng = parseFloat(pickup_longitude);
              const url = Platform.OS === 'ios' 
                ? `maps://app?daddr=${lat},${lng}`
                : `google.navigation:q=${lat},${lng}`;
              
              Linking.canOpenURL(url)
                .then((supported) => {
                  if (supported) {
                    Linking.openURL(url);
                  } else {
                    // Fallback to web maps
                    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    Linking.openURL(webUrl);
                  }
                })
                .catch(() => {
                  Alert.alert('Error', 'Unable to open maps application');
                });
            }
          }
        ]
      );
    } else {
      // Fallback to address-based navigation
      Alert.alert(
        'Navigate to Location',
        `Navigate to: ${address}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Maps', 
            onPress: () => {
              const encodedAddress = encodeURIComponent(address);
              const url = Platform.OS === 'ios' 
                ? `maps://app?daddr=${encodedAddress}`
                : `google.navigation:q=${encodedAddress}`;
              
              Linking.canOpenURL(url)
                .then((supported) => {
                  if (supported) {
                    Linking.openURL(url);
                  } else {
                    // Fallback to web maps
                    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
                    Linking.openURL(webUrl);
                  }
                })
                .catch(() => {
                  Alert.alert('Error', 'Unable to open maps application');
                });
            }
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/collector/CHome')}>
          <Text>
            <Feather name="arrow-left" size={24} color="black" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Assigned Pickups</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapSection onMapReady={handleMapReady} selectedLocation={selectedPickupLocation} />
        
        {/* Center on Collector Button */}
        {collectorLocation && (
          <TouchableOpacity 
            style={styles.centerButton}
            onPress={centerOnCollector}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'red' }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Active Pickups</Text>
              <Text style={styles.emptyText}>You don't have any assigned pickup requests at the moment.</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req.request_id} style={styles.detailsCard}>
                <View style={styles.userSection}>
                  <Text style={styles.userName}>{req.user_name || req.username || `User ID: ${req.user_id}`}</Text>
                  <Text style={styles.userId}>Status: {req.status}</Text>
                </View>

                {/* Location Information */}
                <View style={styles.locationSection}>
                  <TouchableOpacity 
                    style={styles.detailItem}
                    onPress={() => showPickupOnMap(req)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="location-on" size={24} color="#FF5722" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.detailText}>{req.address}</Text>
                      {req.pickup_latitude && req.pickup_longitude && (
                        <Text style={styles.mapHintText}>📍 Tap to show on map</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* GPS Coordinates if available */}
                  {req.pickup_latitude && req.pickup_longitude && (
                    <View style={styles.gpsContainer}>
                      <View style={styles.gpsHeader}>
                        <Ionicons name="navigate-circle" size={20} color="#4CAF50" />
                        <Text style={styles.gpsLabel}>GPS Location Available</Text>
                      </View>
                      <Text style={styles.gpsCoordinates}>
                        📍 {parseFloat(req.pickup_latitude).toFixed(6)}, {parseFloat(req.pickup_longitude).toFixed(6)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={24} color="#2196F3" />
                  <Text style={styles.detailText}>{req.pickup_date} at {req.pickup_time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="delete" size={24} color="#FF9800" />
                  <View style={{ flex: 1 }}>
                    <View style={styles.wasteTypeBadges}>
                      {req.waste_type.split(',').map((type, index) => (
                        <View key={index} style={styles.wasteTypeBadge}>
                          <Text style={styles.wasteTypeBadgeText}>{type.trim()}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.detailText}>{req.description}</Text>
                  </View>
                </View>
                
                {/* Price Information */}
                {req.final_price ? (
                  <View style={styles.detailItem}>
                    <MaterialIcons name="attach-money" size={24} color="#4CAF50" />
                    <Text style={[styles.detailText, styles.priceText]}>
                      Amount: ₱{parseFloat(req.final_price).toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.detailItem}>
                    <MaterialIcons name="attach-money" size={24} color="#FF9800" />
                    <Text style={[styles.detailText, styles.pendingPriceText]}>
                      Price: Pending Admin Approval
                    </Text>
                  </View>
                )}
                
                {/* Price Status */}
                {req.price_status && (
                  <View style={styles.detailItem}>
                    <MaterialIcons name="info" size={24} color="#2196F3" />
                    <Text style={styles.detailText}>
                      Price Status: {req.price_status.charAt(0).toUpperCase() + req.price_status.slice(1)}
                    </Text>
                  </View>
                )}
                
                {req.notes ? (
                  <View style={styles.detailItem}>
                    <MaterialIcons name="note" size={24} color="#9C27B0" />
                    <Text style={styles.detailText}>Notes: {req.notes}</Text>
                  </View>
                ) : null}
                {req.image_url ? (
                  <View style={styles.photosContainer}>
                    <Image source={{ uri: `${API_BASE_URL}${req.image_url}` }} style={styles.photoPlaceholder} />
                  </View>
                ) : null}
                {req.message ? (
                  <View style={styles.messageInput}>
                    <Text style={styles.inputPlaceholder}>Message: {req.message}</Text>
                  </View>
                ) : null}
                {/* Action buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.navigateButton} 
                    onPress={() => startNavigation(req)}
                  >
                    <MaterialIcons name="navigation" size={20} color="white" />
                    <Text style={styles.buttonText}>
                      {req.pickup_latitude && req.pickup_longitude ? 'Navigate (GPS)' : 'Navigate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.collectedButton} 
                    onPress={() => markAsCollected(req.request_id)}
                  >
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Collected</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.missedButton} 
                    onPress={() => markAsMissed(req.request_id)}
                  >
                    <MaterialIcons name="cancel" size={20} color="#F44336" />
                    <Text style={[styles.buttonText, { color: '#F44336' }]}>Missed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  userSection: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#666',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    color: '#666',
  },
  // GPS Location Styles
  locationSection: {
    marginBottom: 12,
  },
  gpsContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginLeft: 36, // Align with the location text
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gpsLabel: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  gpsCoordinates: {
    color: '#2e7d32',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  messageInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    height: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputPlaceholder: {
    color: '#999',
  },
  priceText: {
    fontWeight: 'bold',
    color: '#4CAF50',
    fontSize: 16,
  },
  pendingPriceText: {
    fontStyle: 'italic',
    color: '#FF9800',
  },
  wasteTypeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  wasteTypeBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  wasteTypeBadgeText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  navigateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  collectedButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  missedButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#F44336',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  // Map styles
  mapContainer: {
    height: 300,
    width: '100%',
    backgroundColor: '#e6f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#e6f0ff',
    overflow: 'hidden',
    borderColor: '#0a3d91',
    borderWidth: 1,
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  mapHintText: {
    color: '#2e7d32',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

// Map Component for Special Pickup Locations
const MapSection = ({ onMapReady, selectedLocation }) => {
  const [wvError, setWvError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState('');

  const html = useMemo(() => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/npm/mapbox-gl@1.13.1/dist/mapbox-gl.css" rel="stylesheet" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          html, body { background: #e6f0ff; }
          #map { background: #e6f0ff; position: absolute; inset: 0; }
          canvas { background: #e6f0ff !important; display: block; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          (function () {
            const post = (obj) => { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch (_) {} };
            try { post({ type: 'boot', message: 'WebView HTML booted' }); } catch(_) {}
            try { var c = document.createElement('canvas'); var gl = c.getContext('webgl') || c.getContext('experimental-webgl'); if (!gl) { post({ type: 'init_error', message: 'WebGL not supported. Update Android System WebView/Chrome.' }); return; } } catch (e) { post({ type: 'init_error', message: 'WebGL check failed: ' + (e && e.message ? e.message : e) }); return; }
            const styleObj = { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: 'OpenStreetMap contributors' } }, layers: [ { id: 'osm', type: 'raster', source: 'osm' } ] };
            function start() {
              try {
                const M = window.mapboxgl || window.maplibregl || window.maplibre; if (!M) { post({ type: 'init_error', message: 'Map library missing' }); return; }
                const map = new M.Map({ container: 'map', style: styleObj, center: [125.1716, 6.1164], zoom: 10 });
                let popup = null;
                function handleMessage(event){ 
                  try { 
                    const data = JSON.parse(event.data); 
                    if (data.type === 'set_pickup_markers' && Array.isArray(data.markers)) { 
                      const fc = { type: 'FeatureCollection', features: data.markers.map(loc => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(loc.longitude), parseFloat(loc.latitude)] }, properties: { name: String(loc.name||'Pickup'), address: String(loc.address||''), request_id: loc.request_id, waste_type: loc.waste_type, final_price: loc.final_price } })).filter(f => Number.isFinite(f.geometry.coordinates[0]) && Number.isFinite(f.geometry.coordinates[1])) }; 
                      const src = map.getSource('pickups'); 
                      if (src) src.setData(fc); 
                    } else if (data.type === 'set_collector_location' && data.location) { 
                      const lng = parseFloat(data.location.longitude), lat = parseFloat(data.location.latitude); 
                      if (Number.isFinite(lng) && Number.isFinite(lat)) { 
                        const src = map.getSource('collector'); 
                        if (src) src.setData({ type: 'FeatureCollection', features: [ { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} } ] }); 
                      } 
                    } else if (data.type === 'center_on_collector' && data.location) { 
                      const lng = parseFloat(data.location.longitude), lat = parseFloat(data.location.latitude); 
                      if (Number.isFinite(lng) && Number.isFinite(lat)) { 
                        map.flyTo({ center: [lng, lat], zoom: 16, duration: 1000 }); 
                      } 
                    } else if (data.type === 'draw_route' && data.from && data.to) { 
                      const fromLng = parseFloat(data.from.longitude), fromLat = parseFloat(data.from.latitude); 
                      const toLng = parseFloat(data.to.longitude), toLat = parseFloat(data.to.latitude); 
                      if (Number.isFinite(fromLng) && Number.isFinite(fromLat) && Number.isFinite(toLng) && Number.isFinite(toLat)) { 
                        const src = map.getSource('route'); 
                        if (src) src.setData({ type: 'FeatureCollection', features: [ { type: 'Feature', geometry: { type: 'LineString', coordinates: [[fromLng, fromLat], [toLng, toLat]] }, properties: {} } ] }); 
                      } 
                    } else if (data.type === 'show_pickup_location' && data.location) { 
                      const lng = parseFloat(data.location.longitude), lat = parseFloat(data.location.latitude); 
                      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return; 
                      const src = map.getSource('selected_pickup'); 
                      if (src) src.setData({ type: 'FeatureCollection', features: [ { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { name: String(data.location.name||'Pickup'), address: String(data.location.address||''), waste_type: String(data.location.waste_type||''), final_price: data.location.final_price } } ] }); 
                      map.flyTo({ center: [lng, lat], zoom: 17, duration: 1500 }); 
                      setTimeout(() => { 
                        try { 
                          if (popup) popup.remove(); 
                          const priceText = data.location.final_price ? \`<div style="color:#4CAF50;font-weight:600;margin-top:4px">₱\${parseFloat(data.location.final_price).toFixed(2)}</div>\` : '';
                          popup = new M.Popup({ offset: 10, closeButton: false }).setLngLat([lng, lat]).setHTML('<div style="font-family: sans-serif; padding: 12px; min-width: 220px"><div style="font-weight:700;color:#ff5722;margin-bottom:6px">🗑️ ' + (data.location.name || 'Special Pickup') + '</div><div style="font-size:12px;color:#555">' + (data.location.address || '') + '</div>' + priceText + '</div>').addTo(map); 
                        } catch(_){} 
                      }, 100); 
                    } 
                  } catch(_){} 
                }
                window.addEventListener('message', handleMessage); document.addEventListener('message', handleMessage); window.onMessage = handleMessage;
                map.on('load', () => { 
                  post({ type: 'loaded' }); 
                  if (!map.getSource('pickups')) map.addSource('pickups', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getSource('selected_pickup')) map.addSource('selected_pickup', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getSource('collector')) map.addSource('collector', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getSource('route')) map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getLayer('route-layer')) map.addLayer({ id: 'route-layer', type: 'line', source: 'route', paint: { 'line-color': '#2196F3', 'line-width': 3, 'line-dasharray': [2, 2] } }); 
                  if (!map.getLayer('pickups-layer')) map.addLayer({ id: 'pickups-layer', type: 'circle', source: 'pickups', paint: { 'circle-radius': 6, 'circle-color': '#ff9800', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } }); 
                  if (!map.getLayer('selected-pickup-layer')) map.addLayer({ id: 'selected-pickup-layer', type: 'circle', source: 'selected_pickup', paint: { 'circle-radius': 8, 'circle-color': '#ff5722', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } }); 
                  if (!map.getLayer('collector-layer')) map.addLayer({ id: 'collector-layer', type: 'circle', source: 'collector', paint: { 'circle-radius': 6, 'circle-color': '#1976d2', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } }); 
                  map.on('click', 'pickups-layer', (e) => { 
                    try { 
                      const f = e.features && e.features[0]; 
                      if (!f) return; 
                      const [lng, lat] = f.geometry.coordinates; 
                      const name = f.properties && f.properties.name; 
                      const address = f.properties && f.properties.address; 
                      const wasteType = f.properties && f.properties.waste_type;
                      const finalPrice = f.properties && f.properties.final_price;
                      if (popup) popup.remove(); 
                      const priceText = finalPrice ? \`<div style="color:#4CAF50;font-weight:600;margin-top:4px">₱\${parseFloat(finalPrice).toFixed(2)}</div>\` : '';
                      popup = new M.Popup({ offset: 10, closeButton: false }).setLngLat([lng, lat]).setHTML('<div style="font-family: sans-serif; padding: 12px; min-width: 220px"><div style="font-weight:700;color:#ff9800;margin-bottom:6px">🗑️ ' + (name || 'Special Pickup') + '</div><div style="font-size:11px;color:#666;margin-bottom:2px">' + (wasteType || '') + '</div><div style="font-size:12px;color:#555">' + (address || '') + '</div>' + priceText + '</div>').addTo(map); 
                    } catch(_){} 
                  }); 
                });
                map.on('error', (e) => { try { var msg = (e && e.error && e.error.message) || (e && e.message) || (e && e.type) || 'Unknown map error'; post({ type: 'map_error', message: msg }); } catch(_) { post({ type: 'map_error', message: 'Unknown map error' }); } });
              } catch (err) { post({ type: 'init_error', message: String(err && err.message || err) }); }
            }
            if (window.mapboxgl || window.maplibregl || window.maplibre) { start(); } else { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/mapbox-gl@1.13.1/dist/mapbox-gl.js'; s.async = true; s.crossOrigin = 'anonymous'; s.onload = start; s.onerror = function(){ post({ type: 'init_error', message: 'Failed to load map library' }); }; document.body.appendChild(s); }
            setTimeout(function(){ if (!(window.mapboxgl || window.maplibregl || window.maplibre)) { post({ type: 'init_error', message: 'Map library failed to load within 5s. Check internet/CDN or update Android System WebView.' }); } }, 5000);
          })();
        </script>
      </body>
    </html>
  `, []);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Special Pickup Map WebView message:', data);
      if (data.type === 'loaded') setLoaded(true);
      if (data.type === 'progress') setProgress(data.message || '');
      if (data.type === 'init_error') setWvError(data.message || 'Unknown init error');
      if (data.type === 'cdn_try') setProgress(`Trying: ${data.url}`);
      if (data.type === 'cdn_error') setProgress(`Failed: ${data.url}`);
      if (data.type === 'boot') setProgress('Booted');
    } catch {
      // ignore
    }
  }, [loaded]);

  const onError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('Special Pickup MapSection WebView: onError', nativeEvent);
    setWvError(nativeEvent?.description || 'WebView failed to load');
  }, []);

  return (
    <View style={styles.mapWrapper}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#e6f0ff' }} pointerEvents="none" />
      <WebView
        ref={useCallback((ref) => {
          if (ref && onMapReady) {
            onMapReady(ref);
          }
        }, [onMapReady])}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.map}
        containerStyle={{ backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowFileAccess
        allowUniversalAccessFromFileURLs
        onShouldStartLoadWithRequest={() => true}
        onLoadStart={(e) => console.log('Special Pickup MapSection WebView: onLoadStart', e?.nativeEvent?.url)}
        onLoadEnd={(e) => console.log('Special Pickup MapSection WebView: onLoadEnd', e?.nativeEvent?.url)}
        onNavigationStateChange={(nav) => console.log('Special Pickup MapSection WebView: nav change', nav && { url: nav.url, loading: nav.loading })}
        onHttpError={(e) => setWvError(`HTTP ${e?.nativeEvent?.statusCode} while loading resource`)}
        onMessage={onMessage}
        onError={onError}
        androidLayerType="hardware"
      />
      {!loaded && (
        <Text style={{ position: 'absolute', color: '#555' }}>Loading map… {progress}</Text>
      )}
      {!loaded && wvError && (
        <Text style={{ position: 'absolute', bottom: 8, color: 'red' }}>Map error: {wvError}</Text>
      )}
    </View>
  );
};

export default SpecialPickup;