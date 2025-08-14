import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';

const BACKEND_URL = 'http://10.31.191.188:5000';

const SpecialPickup = () => {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BACKEND_URL}/api/special-pickup`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch requests');
        setRequests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/collector/CHome')}>
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Pickup Requests</Text>
        <View style={{ width: 24 }} />
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
        <ScrollView contentContainerStyle={styles.content}>
          {requests.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#888' }}>No special pickup requests found.</Text>
          ) : (
            requests.map((req) => (
              <View key={req.request_id} style={styles.detailsCard}>
                <View style={styles.userSection}>
                  <Text style={styles.userName}>User ID: {req.user_id}</Text>
                  <Text style={styles.userId}>Status: {req.status}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name={'check-box'} size={24} color="#4CAF50" />
                  <Text style={styles.detailText}>{req.address}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name={'check-box'} size={24} color="#4CAF50" />
                  <Text style={styles.detailText}>{req.pickup_date} {req.pickup_time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name={'check-box'} size={24} color="#4CAF50" />
                  <Text style={styles.detailText}>{req.waste_type} - {req.description}</Text>
                </View>
                {req.notes ? (
                  <View style={styles.detailItem}>
                    <MaterialIcons name={'check-box'} size={24} color="#4CAF50" />
                    <Text style={styles.detailText}>Notes: {req.notes}</Text>
                  </View>
                ) : null}
                {req.image_url ? (
                  <View style={styles.photosContainer}>
                    <Image source={{ uri: req.image_url }} style={styles.photoPlaceholder} />
                  </View>
                ) : null}
                {req.message ? (
                  <View style={styles.messageInput}>
                    <Text style={styles.inputPlaceholder}>Message: {req.message}</Text>
                  </View>
                ) : null}
                {/* Mark as Collected button (future: PATCH status) */}
                <View style={styles.footer}>
                  <TouchableOpacity style={styles.collectedButton}>
                    <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Mark as Collected</Text>
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navigateButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectedButton: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SpecialPickup;