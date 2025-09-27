import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getUserId, getCollectorId } from '../auth';

const SpecialPickup = () => {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [collectorId, setCollectorId] = useState(null);

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

  const startNavigation = (address) => {
    Alert.alert(
      'Navigate to Location',
      `Open navigation to: ${address}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Maps', 
          onPress: () => {
            // This would open the device's default maps app
            // For now, just show an alert
            Alert.alert('Navigation', 'Opening maps navigation...');
          }
        }
      ]
    );
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
                  <Text style={styles.userName}>User ID: {req.user_id}</Text>
                  <Text style={styles.userId}>Status: {req.status}</Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialIcons name="location-on" size={24} color="#FF5722" />
                  <Text style={styles.detailText}>{req.address}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={24} color="#2196F3" />
                  <Text style={styles.detailText}>{req.pickup_date} at {req.pickup_time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="delete" size={24} color="#FF9800" />
                  <Text style={styles.detailText}>{req.waste_type} - {req.description}</Text>
                </View>
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
                    onPress={() => startNavigation(req.address)}
                  >
                    <MaterialIcons name="navigation" size={20} color="white" />
                    <Text style={styles.buttonText}>Navigate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.collectedButton} 
                    onPress={() => markAsCollected(req.request_id)}
                  >
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Collected</Text>
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
    marginTop: 16,
    gap: 12,
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