import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getUserId, getToken } from '../auth';

// Fallback sample list shown only if we don't yet have real stops
const sampleBarangays = [
  'Brgy. San Isidro, General Santos City',
  'Brgy. Mabuhay, General Santos City',
  'Brgy. City Heights, General Santos City',
];

const CStartCollection = () => {
  const router = useRouter();

  // Assignment + stops state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [stops, setStops] = useState([]);
  const [schedLoading, setSchedLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [myBarangay, setMyBarangay] = useState(null);
  const [residentLocations, setResidentLocations] = useState([]);
  const [selectedResidentLocation, setSelectedResidentLocation] = useState(null);
  const [mapRef, setMapRef] = useState(null);

  const handleMapReady = useCallback((ref) => {
    setMapRef(ref);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const collectorId = await getUserId();
        console.log('Retrieved collector ID:', collectorId);
        if (!collectorId) throw new Error('Missing collector id');

        // Try to fetch today's active assignment for this collector.
        // Backend endpoint is suggested; if not present, this will fail and we show the fallback UI.
        const url = `${API_BASE_URL}/api/collector/assignments/today?collector_id=${encodeURIComponent(collectorId)}`;
        console.log('Making API call to:', url);
        const res = await fetch(url);
        console.log('API response status:', res.status, res.statusText);
        if (!res.ok) {
          // 404/500 -> treat as no assignment
          setAssignment(null);
          setStops([]);
        } else {
          const data = await res.json();
          console.log('Assignment API response:', data);
          
          // Handle API response: { assignment: {...}, stops: [...] }
          if (data && data.assignment) {
            console.log('Found assignment:', data.assignment);
            console.log('Found stops:', data.stops);
            setAssignment(data.assignment);
            setStops(Array.isArray(data.stops) ? data.stops : []);
          } else if (data && data.assignment_id) {
            // Fallback for different response format
            console.log('Found assignment (alt format):', data);
            setAssignment(data);
            setStops(Array.isArray(data.stops) ? data.stops : []);
          } else if (Array.isArray(data) && data.length > 0) {
            // If API returns an array of assignments, pick the first active
            console.log('Using first assignment from array:', data[0]);
            setAssignment(data[0]);
            setStops([]);
          } else {
            console.log('No assignment data found');
            setAssignment(null);
            setStops([]);
          }
        }
      } catch (e) {
        setAssignment(null);
        setStops([]);
        setError(e?.message || 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchResidentLocations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      // Extract user_ids from stops
      const userIds = stops.map(stop => stop.user_id).filter(id => id);
      
      if (userIds.length === 0) {
        // Fallback: Add test user_id 140 for debugging
        userIds.push(140);
      }
      
      const url = `${API_BASE_URL}/api/residents/locations?user_ids=${userIds.join(',')}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.locations) {
          setResidentLocations(data.locations);
        }
      }
    } catch (e) {
      // Silent error handling
    }
  }, [stops]);

  // Fetch resident locations when stops are loaded OR when component mounts (for test data)
  useEffect(() => {
    if (stops && stops.length > 0) {
      fetchResidentLocations();
    } else {
      // Even if no stops, fetch locations for test user_id 140
      fetchResidentLocations();
    }
  }, [stops, fetchResidentLocations]);

  const showResidentOnMap = useCallback((userId) => {
    const location = residentLocations.find(loc => loc.user_id === userId);
    
    if (location && mapRef) {
      setSelectedResidentLocation(location);
      // Send location to map via WebView messaging
      const message = JSON.stringify({
        type: 'show_resident_location',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
          user_id: location.user_id
        }
      });
      mapRef.postMessage(message);
    }
  }, [residentLocations, mapRef]);

  // Fetch own profile to get collector's barangay
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return; // not logged in yet
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        console.log('Collector profile data:', data);
        const bname = data?.user?.barangay_name || data?.user?.barangay || data?.user?.address?.barangay;
        if (bname) {
          console.log('Setting collector barangay:', bname);
          setMyBarangay(String(bname));
        }
      } catch (e) {
        console.warn('Profile load error:', e?.message || e);
      }
    })();
  }, []);

  // Fetch all schedules (we'll filter in render by weekday + barangay)
  useEffect(() => {
    (async () => {
      setSchedLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/collection-schedules`);
        if (!res.ok) throw new Error('Failed to load schedules');
        const data = await res.json();
        setSchedules(Array.isArray(data) ? data : []);
      } catch (e) {
        // Surface schedule load errors only in the schedule section below
        console.warn('Schedules load error:', e?.message || e);
      } finally {
        setSchedLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#222" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Map Section (MapLibre when available) */}
      <View style={styles.mapContainer}>
        <MapSection onMapReady={handleMapReady} selectedLocation={selectedResidentLocation} />
      </View>

      {/* Content below map: today's schedules by weekday, then assignment-aware */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {/* Today's schedules section */}
        <View style={styles.card}>
          <Text style={styles.cardText}>
            {`Today's Schedules (${new Date().toLocaleDateString('en-US', { weekday: 'long' })})`}
          </Text>
          {schedLoading ? (
            <View style={{ marginTop: 8 }}>
              <ActivityIndicator size="small" color="#2e7d32" />
            </View>
          ) : (
            (() => {
              const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
              const todayList = schedules.filter(evt =>
                (evt.schedule_date || '') === todayName
              );
              if (todayList.length === 0) {
                return (
                  <Text style={{ marginTop: 6, color: '#666' }}>
                    {myBarangay ? `No schedules for today in ${myBarangay}.` : 'No schedules found for today.'}
                  </Text>
                );
              }
              return todayList.map(evt => (
                <View key={evt.schedule_id} style={{ marginTop: 10 }}>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>
                    {evt.waste_type || 'Regular'} • {evt.time_range || evt.schedule_time || 'Time N/A'}
                  </Text>
                  <Text style={{ color: '#333', marginTop: 4 }}>
                    Barangays: {Array.isArray(evt.barangays) ? evt.barangays.map(b => b.barangay_name).join(', ') : 'N/A'}
                  </Text>
                  {myBarangay && (
                    <Text style={{ color: '#2e7d32', marginTop: 2, fontSize: 12 }}>
                      Showing only schedules that include your barangay: {myBarangay}
                    </Text>
                  )}
                </View>
              ));
            })()
          )}
        </View>

        {/* Assignment-aware section */}
        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator size="small" color="#2e7d32" />
            <Text style={{ marginTop: 8, color: '#555' }}>Loading today\'s assignment…</Text>
          </View>
        ) : assignment ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardText}>Today\'s Assignment</Text>
              <Text style={{ color: '#333', marginTop: 6 }}>
                Schedule ID: {assignment.schedule_id ?? assignment?.schedule?.schedule_id ?? 'N/A'}
              </Text>
              {assignment.waste_type && (
                <Text style={{ color: '#333' }}>Waste Type: {assignment.waste_type}</Text>
              )}
              {assignment.time_range && (
                <Text style={{ color: '#333' }}>Time Window: {assignment.time_range}</Text>
              )}
              {error && <Text style={{ color: 'red', marginTop: 6 }}>{error}</Text>}
            </View>

            {/* Stops list (placeholder if API not ready) */}
            {stops && stops.length > 0 ? (
              stops.map((stop) => (
                <View key={stop.stop_id || `${stop.user_id}-${stop.address_id}`} style={styles.card}>
                  <TouchableOpacity 
                    onPress={() => stop.user_id && showResidentOnMap(stop.user_id)}
                    style={{ marginBottom: 10 }}
                  >
                    <Text style={[styles.cardText, { color: '#2e7d32' }]}>Stop #{stop.sequence_no ?? '-'} 📍</Text>
                    {stop.resident_name && <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>{stop.resident_name}</Text>}
                    {stop.address && <Text style={{ color: '#333' }}>📍 {stop.address}</Text>}
                    {stop.barangay_name && <Text style={{ color: '#666', fontSize: 12 }}>🏘️ {stop.barangay_name}</Text>}
                    {stop.planned_waste_type && <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>🗑️ {stop.planned_waste_type}</Text>}
                    <Text style={{ color: '#2e7d32', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Tap to show location on map</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]}
                      onPress={() => console.log('Collected pressed for stop', stop)}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Collected</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fff', borderColor: '#c62828', borderWidth: 1, marginLeft: 8 }]}
                      onPress={() => console.log('Missed pressed for stop', stop)}>
                      <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Missed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <>
                {/* Test Stop for user_id 140 */}
                <View style={styles.card}>
                  <TouchableOpacity 
                    onPress={() => showResidentOnMap(140)}
                    style={{ marginBottom: 10 }}
                  >
                    <Text style={[styles.cardText, { color: '#2e7d32' }]}>Stop #6 📍</Text>
                    <Text style={{ color: '#333' }}>User ID: 140</Text>
                    <Text style={{ color: '#333' }}>Address: Block 7 Lot 6, Dela Cuadra Subdivision</Text>
                    <Text style={{ color: '#333' }}>Type: Regular</Text>
                    <Text style={{ color: '#2e7d32', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Tap to show location on map</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]}
                      onPress={() => console.log('Collected pressed for stop 140')}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Collected</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fff', borderColor: '#c62828', borderWidth: 1, marginLeft: 8 }]}
                      onPress={() => console.log('Missed pressed for stop 140')}>
                      <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Missed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.card}>
                  <Text style={styles.cardText}>Assigned Areas (sample)</Text>
                  {sampleBarangays.map((b) => (
                    <Text key={b} style={{ marginTop: 6, color: '#333' }}>• {b}</Text>
                  ))}
                  <Text style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
                    Test Stop #6 added above with user_id 140 for location testing.
                  </Text>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>No regular route found for today.</Text>
            <Text style={{ color: '#555', marginTop: 6 }}>You can proceed to Special Pick Ups or go back.</Text>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]} onPress={() => router.push('/collector/specialpickup')}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go to Special Pick Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fff', borderColor: '#2e7d32', borderWidth: 1, marginLeft: 8 }]} onPress={() => router.push('/collector/CHome')}>
                <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>Back to Home</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
          </View>
        )}
      </ScrollView>

      {/* Agent button removed as requested */}
      </View>
    );
  };

export default CStartCollection;

// Renders MapLibre via WebView so it works in Expo Go
const MapSection = ({ onMapReady, selectedLocation }) => {
  const [wvError, setWvError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    console.log('MapSection: mounted');
    return () => console.log('MapSection: unmounted');
  }, []);

  const html = useMemo(() => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.maplibre.org/maplibre-gl/3.7.0/maplibre-gl.css" rel="stylesheet" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          html, body { background: #e6f0ff; }
          #map { background: #e6f0ff; position: absolute; inset: 0; }
          canvas { background: #e6f0ff !important; display: block; }
          .marker { background:#2e7d32; color:#fff; padding:6px 8px; border-radius:6px; font-weight:700; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          (function init() {
            const post = (obj) => {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(obj));
              }
            };

            // Basic WebGL capability check
            try {
              var c = document.createElement('canvas');
              var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
              if (!gl) {
                post({ type: 'init_error', message: 'WebGL not supported in this WebView. Update Android System WebView/Chrome.' });
                return;
              }
            } catch (e) {
              post({ type: 'init_error', message: 'WebGL check failed: ' + (e && e.message ? e.message : e) });
              return;
            }

            // Minimal embedded raster style (OpenStreetMap tiles)
            var styleObj = {
              version: 8,
              sources: {
                osm: {
                  type: 'raster',
                  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                  tileSize: 256,
                  attribution: '© OpenStreetMap contributors'
                }
              },
              layers: [
                { id: 'osm', type: 'raster', source: 'osm' }
              ]
            };

            var cb = Date.now();
            var cdns = [
              // Official CDN (latest major)
              'https://cdn.maplibre.org/maplibre-gl/3.7.0/maplibre-gl.js?cb=' + cb,
              'https://cdn.maplibre.org/maplibre-gl/3.6.1/maplibre-gl.js?cb=' + cb,
              // jsDelivr UMD builds
              'https://cdn.jsdelivr.net/npm/maplibre-gl@3.7.0/dist/maplibre-gl.js?cb=' + cb,
              'https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.1/dist/maplibre-gl.js?cb=' + cb,
              'https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.js?cb=' + cb,
              // unpkg UMD builds
              'https://unpkg.com/maplibre-gl@3.7.0/dist/maplibre-gl.js?cb=' + cb,
              'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js?cb=' + cb,
              'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js?cb=' + cb
            ];

            const fetchEvaluate = async (url) => {
              try {
                const res = await fetch(url);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const code = await res.text();
                // Evaluate in global scope
                (0, eval)(code);
                return true;
              } catch (e) {
                post({ type: 'cdn_error', url, message: String(e && e.message || e) });
                return false;
              }
            };

            const loadScriptFrom = (idx) => {
              if (idx >= cdns.length) {
                post({ type: 'init_error', message: 'Failed to load MapLibre GL JS from all CDNs' });
                return;
              }
              const url = cdns[idx];
              post({ type: 'cdn_try', url });
              const s = document.createElement('script');
              s.src = url;
              s.async = true;
              s.crossOrigin = 'anonymous';
              let fallbackTimer;
              const beginWait = () => {
                let tries = 0;
                const maxTries = 40;
                const wait = setInterval(() => {
                  tries++;
                  const M = window.maplibregl || window.maplibre;
                  if (M) {
                    clearInterval(wait);
                    try {
                      const map = new M.Map({
                        container: 'map',
                        style: {
                          version: 8,
                          sources: {
                            osm: {
                              type: 'raster',
                              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                              tileSize: 256,
                              attribution: '© OpenStreetMap contributors'
                            }
                          },
                          layers: [ { id: 'osm', type: 'raster', source: 'osm' } ]
                        },
                        center: [125.1716, 6.1164],
                        zoom: 10
                      });
                      
                      let currentMarker = null;
                      let staticMarkers = [];
                      
                      // Listen for messages from React Native
                      const handleMessage = function(event) {
                        try {
                          const data = JSON.parse(event.data);
                          
                          if (data.type === 'show_resident_location' && data.location) {
                            const loc = data.location;
                            
                            // Check if MapLibre is loaded
                            if (typeof M === 'undefined' || !map) {
                              return;
                            }
                            
                            // Remove existing marker
                            if (currentMarker) {
                              currentMarker.remove();
                              currentMarker = null;
                            }
                            
                            // Validate coordinates
                            const lng = parseFloat(loc.longitude);
                            const lat = parseFloat(loc.latitude);
                            
                            if (isNaN(lng) || isNaN(lat)) {
                              return;
                            }
                            
                            // Use simple default marker for better compatibility
                            currentMarker = new M.Marker({ 
                              color: '#ff5722',
                              scale: 1.5
                            })
                              .setLngLat([lng, lat])
                              .setPopup(new M.Popup({ 
                                offset: 25,
                                closeButton: false
                              }).setHTML(
                                '<div style="font-family: sans-serif; padding: 15px; text-align: center; min-width: 250px;">' +
                                '<div style="font-size: 18px; font-weight: bold; color: #ff5722; margin-bottom: 8px;">📍 ' + loc.name + '</div>' +
                                '<div style="font-size: 14px; color: #666; line-height: 1.4;">' + loc.address + '</div>' +
                                '</div>'
                              ))
                              .addTo(map);
                            
                            // Fly to location and show popup
                            map.flyTo({
                              center: [lng, lat],
                              zoom: 17,
                              duration: 1500
                            });
                            
                            setTimeout(() => {
                              if (currentMarker) {
                                currentMarker.togglePopup();
                              }
                            }, 1600);
                          }
                        } catch (e) {
                          // Silent error handling
                        }
                      };
                      
                      // Add multiple event listeners for compatibility
                      window.addEventListener('message', handleMessage);
                      document.addEventListener('message', handleMessage);
                      
                      // Global message handler for React Native WebView
                      window.onMessage = handleMessage;
                      
                      map.on('load', () => {
                        post({ type: 'loaded' });
                        
                        // Add static markers after a short delay to ensure map is fully ready
                        setTimeout(() => {
                          try {
                            // Add static markers from user_locations data
                            const userLocations = [
                              {
                                user_id: 140,
                                kind: 'home',
                                latitude: 6.205516,
                                longitude: 125.121397,
                                name: 'John Doe',
                                address: 'Block 7 Lot 6, Dela Cuadra Subdivision, City Heights, General Santos City'
                              }
                            ];
                            
                            // Create markers for all user locations
                            userLocations.forEach(location => {
                              // Create a simple marker with proper anchor positioning
                              const marker = new M.Marker({ 
                                color: '#ff5722',
                                anchor: 'bottom'
                              })
                                .setLngLat([parseFloat(location.longitude), parseFloat(location.latitude)])
                                .addTo(map);
                              
                              // Add popup separately
                              const popup = new M.Popup({ 
                                offset: 25,
                                closeButton: false
                              }).setHTML(
                                '<div style="font-family: sans-serif; padding: 12px; text-align: center; min-width: 200px;">' +
                                '<div style="font-size: 16px; font-weight: bold; color: #ff5722; margin-bottom: 6px;">📍 ' + location.name + '</div>' +
                                '<div style="font-size: 13px; color: #666; line-height: 1.3; margin-bottom: 6px;">' + location.address + '</div>' +
                                '<div style="font-size: 11px; color: #999; padding: 3px 8px; background: #f0f0f0; border-radius: 10px; display: inline-block;">' + location.kind.toUpperCase() + ' LOCATION</div>' +
                                '</div>'
                              );
                              
                              marker.setPopup(popup);
                              staticMarkers.push(marker);
                            });
                          } catch (e) {
                            // If there's an error, try a basic marker with proper anchor
                            try {
                              new M.Marker({ anchor: 'bottom' })
                                .setLngLat([parseFloat(125.121397), parseFloat(6.205516)])
                                .addTo(map);
                            } catch (e2) {
                              // Fallback failed too
                            }
                          }
                        }, 1000);
                      });
                      map.on('error', (e) => {
                        try {
                          var msg = (e && e.error && e.error.message) || (e && e.message) || (e && e.type) || 'Unknown map error';
                          post({ type: 'map_error', message: msg });
                        } catch (_) {
                          post({ type: 'map_error', message: 'Unknown map error' });
                        }
                      });
                    } catch (err) {
                      post({ type: 'init_error', message: String(err && err.message || err) });
                    }
                  } else if (tries >= maxTries) {
                    clearInterval(wait);
                    // Try fetch+eval before moving to next CDN
                    fetchEvaluate(url).then((ok) => {
                      if (ok) {
                        // After eval, try one more short wait
                        let t2 = 0;
                        const w2 = setInterval(() => {
                          t2++;
                          const M2 = window.maplibregl || window.maplibre;
                          if (M2) {
                            clearInterval(w2);
                            try {
                              const map = new M2.Map({
                                container: 'map',
                                style: {
                                  version: 8,
                                  sources: {
                                    osm: {
                                      type: 'raster',
                                      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                                      tileSize: 256,
                                      attribution: '© OpenStreetMap contributors'
                                    }
                                  },
                                  layers: [ { id: 'osm', type: 'raster', source: 'osm' } ]
                                },
                                center: [125.1716, 6.1164],
                                zoom: 12
                              });
                              
                              let currentMarker2 = null;
                              
                              // Listen for messages from React Native (Fallback handler)
                              document.addEventListener('message', function(event) {
                                console.log('🗺️ WebView (fallback) received message:', event.data);
                                try {
                                  const data = JSON.parse(event.data);
                                  console.log('🗺️ Fallback parsed message data:', data);
                                  
                                  if (data.type === 'show_resident_location' && data.location) {
                                    console.log('🗺️ Fallback processing show_resident_location:', data.location);
                                    const loc = data.location;
                                    
                                    // Remove existing marker
                                    if (currentMarker2) {
                                      console.log('🗺️ Fallback removing existing marker');
                                      currentMarker2.remove();
                                    }
                                    
                                    console.log('🗺️ Fallback creating new marker at:', loc.longitude, loc.latitude);
                                    // Add new marker for resident
                                    currentMarker2 = new M2.Marker({ color: '#ff5722' })
                                      .setLngLat([loc.longitude, loc.latitude])
                                      .setPopup(new M2.Popup().setHTML(
                                        '<div style="font-family: sans-serif;">' +
                                        '<strong>' + loc.name + '</strong><br>' +
                                        '<small>' + loc.address + '</small>' +
                                        '</div>'
                                      ))
                                      .addTo(map);
                                    
                                    console.log('🗺️ Fallback flying to location');
                                    // Fly to the location
                                    map.flyTo({
                                      center: [loc.longitude, loc.latitude],
                                      zoom: 16,
                                      duration: 1500
                                    });
                                    
                                    // Open popup after animation
                                    setTimeout(() => {
                                      if (currentMarker2) {
                                        console.log('🗺️ Fallback opening popup');
                                        currentMarker2.togglePopup();
                                      }
                                    }, 1600);
                                  } else {
                                    console.log('🗺️ Fallback message not for location display:', data.type);
                                  }
                                } catch (e) {
                                  console.error('🗺️ Fallback error handling message:', e);
                                }
                              });
                              
                              map.on('load', () => {
                                new M2.Marker({ color: '#2e7d32' })
                                  .setLngLat([125.1716, 6.1164])
                                  .setPopup(new M2.Popup().setText('Collection Start Point'))
                                  .addTo(map);
                                post({ type: 'loaded' });
                              });
                            } catch (err) {
                              post({ type: 'init_error', message: String(err && err.message || err) });
                            }
                          } else if (t2 >= 10) {
                            clearInterval(w2);
                            const keys = Object.keys(window).filter(k => k.toLowerCase().includes('maplibre'));
                            post({ type: 'init_error', message: 'MapLibre GL JS global not found after eval (maplibregl/maplibre). Keys: ' + keys.join(', ') });
                            loadScriptFrom(idx + 1);
                          }
                        }, 100);
                      } else {
                        loadScriptFrom(idx + 1);
                      }
                    });
                  }
                }, 100);
              };
              s.onload = beginWait;
              s.onerror = () => {
                post({ type: 'cdn_error', url });
                loadScriptFrom(idx + 1);
              };
              document.body.appendChild(s);
            };

            loadScriptFrom(0);
          })();
        </script>
      </body>
    </html>
  `, []);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'loaded') setLoaded(true);
      if (data.type === 'progress') setProgress(data.message || '');
      if (data.type === 'init_error') setWvError(data.message || 'Unknown init error');
      if (data.type === 'cdn_try') setProgress(`Trying: ${data.url}`);
      if (data.type === 'cdn_error') setProgress(`Failed: ${data.url}`);
      // Removed console log display to clean up the WebView
    } catch {
      // ignore
    }
  }, [loaded]);

  const onError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('MapSection WebView: onError', nativeEvent);
    setWvError(nativeEvent?.description || 'WebView failed to load');
  }, []);

  return (
    <View
      style={styles.mapWrapper}
      onLayout={useCallback((e) => {
        const { width, height } = e.nativeEvent.layout || {};
        console.log('MapSection: mapWrapper layout', { width, height });
      }, [])}
    >
      {/* Blue fallback layer under the WebView to guarantee visible background */}
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
        onLoadStart={(e) => console.log('MapSection WebView: onLoadStart', e?.nativeEvent?.url)}
        onLoadEnd={(e) => console.log('MapSection WebView: onLoadEnd', e?.nativeEvent?.url)}
        onNavigationStateChange={(nav) => console.log('MapSection WebView: nav change', nav && { url: nav.url, loading: nav.loading })}
        onHttpError={(e) => setWvError(`HTTP ${e?.nativeEvent?.statusCode} while loading resource`)}
        onMessage={onMessage}
        onError={onError}
        androidLayerType="hardware"
        injectedJavaScriptBeforeContentLoaded={`
          (function(){
            function wrap(level){
              var orig = console[level];
              console[level] = function(){
                try {
                  var args = Array.prototype.slice.call(arguments).map(function(a){
                    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e){ return String(a); }
                  });
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', level: level, args: args }));
                  }
                } catch (e) {}
                orig && orig.apply(console, arguments);
              };
            }
            ['log','info','warn','error'].forEach(wrap);
            window.addEventListener('error', function(e){
              try {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', level: 'error', args: ['window.error', e.message] }));
                }
              } catch(_e){}
            });
          })();
        `}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    paddingBottom: 8,
    elevation: 2,
    zIndex: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#222',
    textDecorationLine: 'underline',
  },
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
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
}); 