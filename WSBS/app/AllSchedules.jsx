import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken, getUserId } from './auth';
import { API_BASE_URL } from './config';

const AllSchedules = () => {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBarangay, setUserBarangay] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  const fetchAllSchedules = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const userId = await getUserId();

      if (!token || !userId) {
        setError('Authentication required');
        return;
      }

      // Get user profile to get barangay
      const profileResponse = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let userBarangayName = null;
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        userBarangayName = profileData.barangay;
        setUserBarangay(userBarangayName);
      }

      // Fetch all collection schedules
      const schedulesResponse = await fetch(`${API_BASE_URL}/api/collection-schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        
        // Filter schedules by user's barangay if available
        let filteredSchedules = userBarangayName 
          ? schedulesData.filter(schedule => 
              schedule.barangays && schedule.barangays.some(b => b.barangay_name === userBarangayName)
            )
          : schedulesData;

        // For San Isidro, VSM Heights Phase 1 - show only Wed, Thu, Fri
        const sanIsidroScheduleDays = ['Wednesday', 'Thursday', 'Friday'];
        const isSanIsidroVSM = userBarangayName === 'San Isidro' && 
          filteredSchedules.some(schedule => schedule.subdivision && schedule.subdivision.toLowerCase().includes('vsm'));
        
        if (isSanIsidroVSM) {
          filteredSchedules = filteredSchedules.filter(schedule => 
            sanIsidroScheduleDays.some(day => 
              day.toLowerCase() === (schedule.schedule_date || '').trim().toLowerCase()
            )
          );
        }

        setSchedules(filteredSchedules);
      } else {
        throw new Error('Failed to fetch schedules');
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const getScheduleTypeIcon = (wasteType) => {
    switch (wasteType?.toLowerCase()) {
      case 'biodegradable':
        return 'leaf-outline';
      case 'non-biodegradable':
        return 'trash-outline';
      case 'recyclable':
        return 'refresh-outline';
      default:
        return 'calendar-outline';
    }
  };

  const getScheduleTypeColor = (wasteType) => {
    switch (wasteType?.toLowerCase()) {
      case 'biodegradable':
        return '#4CAF50';
      case 'non-biodegradable':
        return '#FF5722';
      case 'recyclable':
        return '#2196F3';
      default:
        return '#4CD964';
    }
  };

  const formatScheduleDate = (dateString) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    const scheduleDay = days.indexOf(dateString);
    
    if (scheduleDay === today) {
      return `${dateString} (Today)`;
    }
    return dateString;
  };

  const isToday = (dateString) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    const scheduleDay = days.indexOf(dateString);
    return scheduleDay === today;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CD964" />
        <Text style={styles.loadingText}>Loading schedules...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{showAll ? 'All Collection Schedules' : 'Collection Schedule'}</Text>
        <TouchableOpacity onPress={fetchAllSchedules} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {userBarangay && (
          <View style={styles.barangayInfo}>
            <Ionicons name="location" size={16} color="#4CD964" />
            <Text style={styles.barangayText}>Showing schedules for {userBarangay}</Text>
          </View>
        )}

        {/* Show schedule info for San Isidro VSM Heights Phase 1 */}
        {userBarangay === 'San Isidro' && schedules.some(schedule => schedule.subdivision && schedule.subdivision.toLowerCase().includes('vsm')) && (
          <View style={styles.vsmInfoCard}>
            <Ionicons name="information-circle" size={20} color="#4CD964" />
            <Text style={styles.vsmInfoText}>
              Collection Schedule for VSM Heights Phase 1: Wednesday, Thursday, Friday
            </Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF5722" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllSchedules}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Schedules Found</Text>
            <Text style={styles.emptySubtitle}>
              No collection schedules are available for your area at the moment.
            </Text>
          </View>
        ) : (
          <View style={styles.schedulesContainer}>
            {!showAll && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Today's Pickup</Text>
                {(() => {
                  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  const todaySchedule = schedules.find(schedule => 
                    schedule.schedule_date && schedule.schedule_date.toLowerCase() === todayDayName.toLowerCase()
                  );
                  
                  if (todaySchedule) {
                    return (
                      <View style={[styles.scheduleCard, styles.todayScheduleCard]}>
                        <View style={styles.scheduleHeader}>
                          <View style={styles.scheduleDay}>
                            <Ionicons 
                              name={getScheduleTypeIcon(todaySchedule.waste_type)} 
                              size={20} 
                              color={getScheduleTypeColor(todaySchedule.waste_type)} 
                            />
                            <Text style={[styles.scheduleDayText, styles.todayText]}>
                              {todaySchedule.schedule_date} (Today)
                            </Text>
                          </View>
                          {todaySchedule.time_range && (
                            <View style={styles.timeContainer}>
                              <Ionicons name="time-outline" size={16} color="#4CD964" />
                              <Text style={[styles.timeText, styles.todayTimeText]}>
                                {todaySchedule.time_range}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.scheduleDetails}>
                          <View style={styles.detailRow}>
                            <Ionicons name="trash" size={16} color="#4CD964" />
                            <Text style={[styles.detailText, { color: '#4CD964', fontWeight: 'bold' }]}>
                              {todaySchedule.waste_type}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              {todaySchedule.barangays?.map(b => b.barangay_name).join(', ') || 'Your area'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  } else {
                    return (
                      <View style={styles.noScheduleCard}>
                        <Ionicons name="calendar-outline" size={32} color="#ccc" />
                        <Text style={styles.noScheduleText}>No pickup scheduled for today</Text>
                      </View>
                    );
                  }
                })()}

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Upcoming Pickups</Text>
                {(() => {
                  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  const upcomingSchedules = schedules
                    .filter(schedule => 
                      schedule.schedule_date && schedule.schedule_date.toLowerCase() !== todayDayName.toLowerCase()
                    )
                    .slice(0, 3);
                  
                  if (upcomingSchedules.length > 0) {
                    return upcomingSchedules.map((schedule, index) => (
                      <View key={`upcoming-${schedule.schedule_id}-${index}`} style={styles.scheduleCard}>
                        <View style={styles.scheduleHeader}>
                          <View style={styles.scheduleDay}>
                            <Ionicons 
                              name={getScheduleTypeIcon(schedule.waste_type)} 
                              size={20} 
                              color={getScheduleTypeColor(schedule.waste_type)} 
                            />
                            <Text style={styles.scheduleDayText}>
                              {schedule.schedule_date}
                            </Text>
                          </View>
                          {schedule.time_range && (
                            <View style={styles.timeContainer}>
                              <Ionicons name="time-outline" size={16} color="#666" />
                              <Text style={styles.timeText}>
                                {schedule.time_range}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.scheduleDetails}>
                          <View style={styles.detailRow}>
                            <Ionicons name="trash" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              {schedule.waste_type}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ));
                  } else {
                    return (
                      <View style={styles.noScheduleCard}>
                        <Ionicons name="calendar-outline" size={32} color="#ccc" />
                        <Text style={styles.noScheduleText}>No upcoming pickups scheduled</Text>
                      </View>
                    );
                  }
                })()}

                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setShowAll(true)}
                >
                  <Text style={styles.viewAllText}>View All Schedules</Text>
                  <Ionicons name="chevron-forward" size={20} color="#4CD964" />
                </TouchableOpacity>
              </View>
            )}

            {showAll && (
              <View>
                <Text style={styles.schedulesCount}>
                  {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} found
                </Text>
                
                {schedules.map((schedule, index) => {
              const todaySchedule = isToday(schedule.schedule_date);
              const wasteTypeColor = getScheduleTypeColor(schedule.waste_type);
              
              return (
                <View 
                  key={`${schedule.schedule_id}-${index}`} 
                  style={[
                    styles.scheduleCard,
                    todaySchedule && styles.todayScheduleCard
                  ]}
                >
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleDay}>
                      <Ionicons 
                        name={getScheduleTypeIcon(schedule.waste_type)} 
                        size={20} 
                        color={wasteTypeColor} 
                      />
                      <Text style={[
                        styles.scheduleDayText,
                        todaySchedule && styles.todayText
                      ]}>
                        {formatScheduleDate(schedule.schedule_date)}
                      </Text>
                    </View>
                    {schedule.time_range && (
                      <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={[
                          styles.timeText,
                          todaySchedule && styles.todayTimeText
                        ]}>
                          {schedule.time_range}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.scheduleDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {schedule.barangays?.map(b => b.barangay_name).join(', ') || 'Not specified'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Ionicons name="trash-outline" size={16} color={wasteTypeColor} />
                      <Text style={[styles.detailText, { color: wasteTypeColor, fontWeight: '600' }]}>
                        {schedule.waste_type || 'General Waste'}
                      </Text>
                    </View>
                  </View>

                  {todaySchedule && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Collection Today</Text>
                    </View>
                  )}
                </View>
              );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CD964',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  barangayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CD964',
  },
  barangayText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4CD964',
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#FF5722',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  schedulesContainer: {
    paddingBottom: 20,
  },
  schedulesCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontWeight: '500',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
  },
  todayScheduleCard: {
    borderColor: '#4CD964',
    borderWidth: 2,
    backgroundColor: '#f0fff4',
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleDay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  todayText: {
    color: '#4CD964',
    fontWeight: '700',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  todayTimeText: {
    color: '#4CD964',
    fontWeight: '600',
  },
  scheduleDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  todayBadge: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  noScheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  noScheduleText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4CD964',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CD964',
    marginRight: 8,
  },
  vsmInfoCard: { 
    backgroundColor: '#E8F5E8', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 16, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964'
  },
  vsmInfoText: { 
    color: '#2E7D32', 
    fontSize: 14, 
    fontWeight: '600', 
    marginLeft: 8, 
    flex: 1 
  },
});

export default AllSchedules;
