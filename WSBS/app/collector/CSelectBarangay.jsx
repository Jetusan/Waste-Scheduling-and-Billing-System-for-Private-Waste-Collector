import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getToken, getCollectorId } from '../auth';

const CSelectBarangay = () => {
  const router = useRouter();
  const [assignedBarangays, setAssignedBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCollectorAssignments();
  }, []);

  const fetchCollectorAssignments = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      if (!token || !collectorId) {
        Alert.alert('Error', 'Authentication required');
        router.replace('/auth/login');
        return;
      }

      console.log('🔍 Fetching assignments for collector:', collectorId);

      // Fetch collector's own barangay assignments using collector-specific endpoint
      const response = await fetch(
        `${API_BASE_URL}/api/assignments/my-assignments?type=barangay&active_only=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('📋 Assignment response:', data);
      
      if (data.success) {
        // Filter and format assigned barangays
        const barangayList = data.assignments
          .filter(assignment => assignment.barangay_name) // Only assignments with barangay names
          .map(assignment => ({
            barangay_id: assignment.barangay_id,
            barangay_name: assignment.barangay_name,
            assignment_id: assignment.assignment_id,
            shift_label: assignment.shift_label || 'Morning Shift',
            effective_start_date: assignment.effective_start_date
          }));

        console.log('🏘️ Processed barangays:', barangayList);
        setAssignedBarangays(barangayList);
        setError(null);

        if (barangayList.length === 0) {
          setError('No barangay assignments found. Please contact your administrator.');
        }
      } else {
        console.error('❌ Failed to fetch assignments:', data.message);
        setError(data.message || 'Failed to fetch your assignments');
      }
    } catch (err) {
      console.error('❌ Error fetching collector assignments:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarangaySelect = async (barangay) => {
    try {
      // Check if there are residents to collect in this barangay
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      const apiUrl = `${API_BASE_URL}/api/collector/assignments/today?collector_id=${collectorId}&barangay_id=${barangay.barangay_id}`;
      console.log('🔗 API URL:', apiUrl);
      console.log('🔑 Collector ID:', collectorId);
      console.log('🏘️ Barangay ID:', barangay.barangay_id);
      
      const checkResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const checkData = await checkResponse.json();
      console.log('🔍 Collection check response:', JSON.stringify(checkData, null, 2));
      console.log('🔍 Response status:', checkResponse.status);
      console.log('🔍 Stops array:', checkData.stops);
      console.log('🔍 Stops length:', checkData.stops ? checkData.stops.length : 'undefined');
      console.log('🔍 Assignment:', checkData.assignment);
      
      if (checkData.stops && checkData.stops.length > 0) {
        // Navigate to collection page with selected barangay
        console.log('✅ Starting collection for barangay:', barangay.barangay_name);
        router.push({
          pathname: '/collector/CStartCollection',
          params: {
            barangay_id: barangay.barangay_id,
            barangay_name: barangay.barangay_name,
            collector_id: collectorId
          }
        });
      } else {
        Alert.alert(
          'No Collections Available',
          `There are no residents to collect in ${barangay.barangay_name} today.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error checking barangay collections:', err);
      Alert.alert('Error', 'Failed to check collections for this barangay.');
    }
  };

  const renderBarangayCard = (barangay) => (
    <TouchableOpacity
      key={`${barangay.barangay_id}-${barangay.assignment_id}`}
      style={styles.barangayCard}
      onPress={() => handleBarangaySelect(barangay)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="location-city" size={28} color="#4CAF50" />
        </View>
        
        <View style={styles.barangayInfo}>
          <Text style={styles.barangayName}>{barangay.barangay_name}</Text>
          <Text style={styles.shiftLabel}>{barangay.shift_label}</Text>
          <Text style={styles.tapHint}>Tap to start collection</Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Barangay</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading your assigned barangays...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Barangay</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchCollectorAssignments}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.instructionContainer}>
          <MaterialIcons name="info" size={20} color="#4CAF50" />
          <Text style={styles.instructionText}>
            Choose a barangay to start waste collection. Only your assigned areas are shown.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={24} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchCollectorAssignments}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : assignedBarangays.length > 0 ? (
          <View style={styles.barangayList}>
            <Text style={styles.sectionTitle}>Your Assigned Barangays ({assignedBarangays.length})</Text>
            {assignedBarangays.map(renderBarangayCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="location-off" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No Assignments Found</Text>
            <Text style={styles.emptyText}>
              You don't have any barangay assignments yet. Please contact your administrator.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionText: {
    flex: 1,
    marginLeft: 8,
    color: '#2e7d32',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  barangayList: {
    marginBottom: 20,
  },
  barangayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  barangayInfo: {
    flex: 1,
  },
  barangayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shiftLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 2,
  },
  tapHint: {
    fontSize: 12,
    color: '#666',
  },
  arrowContainer: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default CSelectBarangay;
