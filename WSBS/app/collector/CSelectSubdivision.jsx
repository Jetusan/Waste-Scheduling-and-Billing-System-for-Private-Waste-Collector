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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getToken, getCollectorId } from '../auth';

const CSelectSubdivision = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get barangay info from navigation params
  const selectedBarangayId = params.barangay_id;
  const selectedBarangayName = params.barangay_name;
  
  const [subdivisions, setSubdivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionCounts, setCollectionCounts] = useState({});

  useEffect(() => {
    fetchSubdivisions();
  }, []);

  const fetchSubdivisions = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      if (!token || !collectorId) {
        Alert.alert('Error', 'Authentication required');
        router.replace('/auth/login');
        return;
      }

      console.log('🔍 Fetching subdivisions for barangay:', selectedBarangayName);

      // Fetch subdivisions for the selected barangay with collection counts
      const response = await fetch(
        `${API_BASE_URL}/api/collector/subdivisions/${selectedBarangayId}?collector_id=${collectorId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('📋 Subdivision response:', data);
      
      if (data.success) {
        // For San Isidro, prioritize VSM Heights Phase 1
        let subdivisionList = data.subdivisions || [];
        
        // If this is San Isidro, ensure VSM Heights Phase 1 is at the top
        if (selectedBarangayName === 'San Isidro') {
          subdivisionList = subdivisionList.sort((a, b) => {
            if (a.subdivision_name?.toLowerCase().includes('vsm')) return -1;
            if (b.subdivision_name?.toLowerCase().includes('vsm')) return 1;
            return a.subdivision_name?.localeCompare(b.subdivision_name) || 0;
          });
        }
        
        setSubdivisions(subdivisionList);
        setCollectionCounts(data.collection_counts || {});
        setError(null);

        if (subdivisionList.length === 0) {
          setError(`No subdivisions found in ${selectedBarangayName}. You can proceed with general collection.`);
        }
      } else {
        console.error('❌ Failed to fetch subdivisions:', data.message);
        setError(data.message || 'Failed to fetch subdivisions');
      }
    } catch (err) {
      console.error('❌ Error fetching subdivisions:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubdivisionSelect = async (subdivision) => {
    try {
      // Check if there are residents to collect in this subdivision
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      const apiUrl = `${API_BASE_URL}/api/collector/assignments/today?collector_id=${collectorId}&barangay_id=${selectedBarangayId}&subdivision=${encodeURIComponent(subdivision.subdivision_name)}`;
      console.log('🔗 API URL:', apiUrl);
      
      const checkResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const checkData = await checkResponse.json();
      console.log('🔍 Subdivision collection check:', checkData);
      
      if (checkData.stops && checkData.stops.length > 0) {
        console.log('✅ Starting collection for subdivision:', subdivision.subdivision_name);
        
        router.push({
          pathname: '/collector/CStartCollection',
          params: {
            barangay_id: selectedBarangayId,
            barangay_name: selectedBarangayName,
            subdivision_id: subdivision.subdivision_id,
            subdivision_name: subdivision.subdivision_name,
            collector_id: collectorId,
            total_stops: checkData.stops.length.toString()
          }
        });
      } else {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
        let message = `No collections available for ${subdivision.subdivision_name} today (${today}).`;
        
        if (checkData.message) {
          message = checkData.message;
        }
        
        // Check if this is VSM Heights Phase 1 and not collection day
        const isVSM = subdivision.subdivision_name?.toLowerCase().includes('vsm');
        const isMondayTest = subdivision.subdivision_name?.toLowerCase().includes('monday test');
        const isCollectionDay = ['Wednesday', 'Thursday', 'Friday'].includes(today);
        
        if (isVSM && !isCollectionDay) {
          Alert.alert(
            'Collection Day Notice',
            `VSM Heights Phase 1 collection is scheduled for Wednesday, Thursday, and Friday only.\n\nToday is ${today}. Please return on a collection day.`,
            [{ text: 'OK' }]
          );
        } else if (isMondayTest) {
          Alert.alert(
            'Test Area Notice',
            `Monday Test Area is available for collection testing on any day.\n\nToday is ${today}. This area is used for demonstration purposes.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'No Collections Available',
            message,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (err) {
      console.error('Error checking subdivision collections:', err);
      Alert.alert('Error', 'Failed to check collections for this subdivision.');
    }
  };

  const handleGeneralCollection = () => {
    // Proceed without subdivision filter
    router.push({
      pathname: '/collector/CStartCollection',
      params: {
        barangay_id: selectedBarangayId,
        barangay_name: selectedBarangayName,
        collector_id: params.collector_id,
        total_stops: '0' // Will be determined by the collection screen
      }
    });
  };

  const renderSubdivisionCard = (subdivision) => {
    const collectionCount = collectionCounts[subdivision.subdivision_id] || 0;
    const isVSM = subdivision.subdivision_name?.toLowerCase().includes('vsm');
    const isMondayTest = subdivision.subdivision_name?.toLowerCase().includes('monday test');
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    const isCollectionDay = ['Wednesday', 'Thursday', 'Friday'].includes(today);
    
    // Determine availability
    const isAvailable = isMondayTest || (isVSM && isCollectionDay) || (!isVSM && !isMondayTest);
    
    return (
      <TouchableOpacity
        key={subdivision.subdivision_id}
        style={[
          styles.subdivisionCard,
          isVSM && styles.vsmCard,
          isMondayTest && styles.testCard,
          !isAvailable && styles.unavailableCard
        ]}
        onPress={() => handleSubdivisionSelect(subdivision)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={[
            styles.iconContainer, 
            isVSM && styles.vsmIconContainer,
            isMondayTest && styles.testIconContainer
          ]}>
            <Ionicons 
              name={isVSM ? "home" : isMondayTest ? "flask" : "location"} 
              size={28} 
              color={isVSM ? "#4CAF50" : isMondayTest ? "#FF9800" : "#2196F3"} 
            />
          </View>
          
          <View style={styles.subdivisionInfo}>
            <Text style={[
              styles.subdivisionName, 
              isVSM && styles.vsmName,
              isMondayTest && styles.testName
            ]}>
              {subdivision.subdivision_name}
            </Text>
            {isVSM && (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>PRIORITY AREA</Text>
              </View>
            )}
            {isMondayTest && (
              <View style={styles.testBadge}>
                <Text style={styles.testText}>TEST AREA</Text>
              </View>
            )}
            <Text style={styles.collectionCount}>
              {collectionCount} residents to collect
            </Text>
            {!isAvailable && isVSM && (
              <Text style={styles.scheduleNote}>
                📅 Available: Wed, Thu, Fri only
              </Text>
            )}
            {subdivision.description && (
              <Text style={styles.description} numberOfLines={2}>
                {subdivision.description}
              </Text>
            )}
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.headerTitle}>Select Subdivision</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading subdivisions...</Text>
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
        <Text style={styles.headerTitle}>Select Subdivision</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchSubdivisions}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.barangayInfo}>
          <MaterialIcons name="location-on" size={20} color="#4CAF50" />
          <Text style={styles.barangayText}>
            Subdivisions in {selectedBarangayName}
          </Text>
        </View>

        {/* VSM Heights Priority Notice for San Isidro */}
        {selectedBarangayName === 'San Isidro' && (
          <View style={styles.priorityNotice}>
            <Ionicons name="star" size={20} color="#FF9800" />
            <Text style={styles.priorityNoticeText}>
              VSM Heights Phase 1 is your priority collection area
            </Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="info" size={24} color="#FF9800" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : subdivisions.length > 0 ? (
          <View style={styles.subdivisionList}>
            <Text style={styles.sectionTitle}>
              Available Subdivisions ({subdivisions.length})
            </Text>
            {subdivisions.map(renderSubdivisionCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="location-off" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No Subdivisions Found</Text>
            <Text style={styles.emptyText}>
              No subdivisions are configured for {selectedBarangayName}.
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
  barangayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  barangayText: {
    marginLeft: 8,
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  priorityNoticeText: {
    marginLeft: 8,
    color: '#e65100',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#e65100',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subdivisionList: {
    marginBottom: 20,
  },
  subdivisionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  vsmCard: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f8fff8',
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
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vsmIconContainer: {
    backgroundColor: '#e8f5e8',
  },
  subdivisionInfo: {
    flex: 1,
  },
  subdivisionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vsmName: {
    color: '#2e7d32',
  },
  priorityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  collectionCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#666',
  },
  arrowContainer: {
    padding: 4,
  },
  generalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#666',
  },
  generalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  generalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  generalDescription: {
    fontSize: 14,
    color: '#666',
  },
  generalCollectionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  generalCollectionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
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
    marginBottom: 20,
  },
  testCard: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: '#FFF8E1',
  },
  testIconContainer: {
    backgroundColor: '#FFE0B2',
  },
  testName: {
    color: '#F57C00',
    fontWeight: 'bold',
  },
  testBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  testText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unavailableCard: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  scheduleNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default CSelectSubdivision;
