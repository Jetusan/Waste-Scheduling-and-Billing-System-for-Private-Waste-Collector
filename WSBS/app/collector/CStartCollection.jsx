import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { UrlTile, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const barangays = [
  'Brgy. San Isidro, General Santos City',
  'Brgy. Mabuhay, General Santos City',
  'Brgy. City Heights, General Santos City',
];

const CStartCollection = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#222" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: 6.1164, // General Santos City
            longitude: 125.1716,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <UrlTile
            urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          <Marker
            coordinate={{ latitude: 6.1164, longitude: 125.1716 }}
            title="General Santos City"
            description="Start Collection Here"
          />
        </MapView>
      </View>

      {/* Barangay List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {barangays.map((b, idx) => (
          <View key={b} style={styles.card}>
            <Text style={styles.cardText}>{b}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Next/Agent Button */}
      <TouchableOpacity style={styles.agentButton} onPress={() => router.push('/collector/AgentPage')}>
        <Text style={styles.agentButtonText}>Next (Agent)</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CStartCollection;

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
    height: 180,
    width: '100%',
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
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
  agentButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
  },
  agentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 