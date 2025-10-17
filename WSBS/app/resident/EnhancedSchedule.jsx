import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config';
import { getToken } from '../auth';

export default function EnhancedSchedule() {
  const router = useRouter();
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userBarangay, setUserBarangay] = useState('');
  const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming', 'current', 'all'

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userBarangay) {
      fetchSchedules();
    }
  }, [userBarangay, viewMode]);

  const fetchUserProfile = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        setUserBarangay(data.user.barangay_name || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        view: viewMode,
        ...(userBarangay && { user_barangay: userBarangay })
      });
      
      const response = await fetch(`${API_BASE_URL}/api/enhanced-schedules?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      
      const data = await response.json();
      setScheduleData(data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedules();
    setRefreshing(false);
  };

  const getWasteTypeIcon = (wasteType) => {
    const type = wasteType?.toLowerCase() || '';
    if (type.includes('organic')) return 'leaf';
    if (type.includes('recyclable')) return 'refresh';
    if (type.includes('hazardous')) return 'warning';
    return 'trash';
  };

  const getWasteTypeColor = (wasteType) => {
    const type = wasteType?.toLowerCase() || '';
    if (type.includes('organic')) return '#4CAF50';
    if (type.includes('recyclable')) return '#2196F3';
    if (type.includes('hazardous')) return '#FF5722';
    return '#757575';
  };

  const renderScheduleCard = (schedule) => {
    const wasteColor = getWasteTypeColor(schedule.waste_type);
    const isToday = schedule.is_today;
    
    return (
      <View key={schedule.schedule_id} style={[
        styles.scheduleCard,
        isToday && styles.todayCard
      ]}>
        {isToday && (
          <View style={styles.todayBadge}>
            <Ionicons name="today" size={16} color="#fff" />
            <Text style={styles.todayText}>TODAY</Text>
          </View>
        )}
        
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleDay}>
            <Text style={[styles.dayText, isToday && styles.todayDayText]}>
              {schedule.schedule_date}
            </Text>
            <Text style={styles.nextCollectionText}>
              {schedule.next_collection_text}
            </Text>
          </View>
          
          <View style={[styles.wasteTypeIcon, { backgroundColor: wasteColor }]}>
            <Ionicons name={getWasteTypeIcon(schedule.waste_type)} size={24} color="#fff" />
          </View>
        </View>

        <View style={styles.scheduleDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="delete" size={18} color="#666" />
            <Text style={styles.detailText}>{schedule.waste_type}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={18} color="#666" />
            <Text style={styles.detailText}>{schedule.time_range}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={18} color="#666" />
            <Text style={styles.detailText}>
              {schedule.barangays?.length > 0 
                ? schedule.barangays.map(b => b.barangay_name).join(', ')
                : 'All Areas'
              }
            </Text>
          </View>
        </View>

        {schedule.user_barangay_included && (
          <View style={styles.includedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.includedText}>Your area included</Text>
          </View>
        )}
      </View>
    );
  };

  const renderViewModeSelector = () => (
    <View style={styles.viewModeSelector}>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'upcoming' && styles.activeViewMode]}
        onPress={() => setViewMode('upcoming')}
      >
        <Text style={[styles.viewModeText, viewMode === 'upcoming' && styles.activeViewModeText]}>
          Upcoming
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'current' && styles.activeViewMode]}
        onPress={() => setViewMode('current')}
      >
        <Text style={[styles.viewModeText, viewMode === 'current' && styles.activeViewModeText]}>
          Today
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'all' && styles.activeViewMode]}
        onPress={() => setViewMode('all')}
      >
        <Text style={[styles.viewModeText, viewMode === 'all' && styles.activeViewModeText]}>
          All Schedules
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummaryCard = () => {
    if (!scheduleData?.summary) return null;
    
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Collection Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{scheduleData.summary.current}</Text>
            <Text style={styles.summaryLabel}>Today</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{scheduleData.summary.upcoming}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{scheduleData.summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
        {userBarangay && (
          <Text style={styles.barangayInfo}>
            Showing schedules for: {userBarangay}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collection Schedule</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Schedule</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderSummaryCard()}
        {renderViewModeSelector()}

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={48} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSchedules}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : scheduleData?.schedules?.length > 0 ? (
          <View style={styles.schedulesContainer}>
            <Text style={styles.sectionTitle}>
              {viewMode === 'upcoming' && 'Upcoming Collections'}
              {viewMode === 'current' && 'Today\'s Collections'}
              {viewMode === 'all' && 'All Collection Schedules'}
            </Text>
            {scheduleData.schedules.map(renderScheduleCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="schedule" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Schedules Found</Text>
            <Text style={styles.emptyText}>
              {viewMode === 'current' 
                ? 'No collections scheduled for today.'
                : 'No collection schedules available at the moment.'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  barangayInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeViewMode: {
    backgroundColor: '#4CAF50',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeViewModeText: {
    color: '#fff',
  },
  schedulesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  todayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleDay: {
    flex: 1,
  },
  dayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  todayDayText: {
    color: '#4CAF50',
  },
  nextCollectionText: {
    fontSize: 12,
    color: '#666',
  },
  wasteTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  includedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  includedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
    padding: 32,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
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
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
