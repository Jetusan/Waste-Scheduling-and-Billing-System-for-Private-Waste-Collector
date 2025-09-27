import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config';
import { getToken, getCollectorId } from '../../auth';

const CatchupTasksDisplay = ({ visible, onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState(null);

  const fetchCatchupTasks = useCallback(async () => {
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      if (!token || !collectorId) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/enhanced-missed-collection/catchup-tasks?collector_id=${collectorId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTasks(data.tasks || []);
      } else {
        console.error('Failed to fetch catchup tasks:', data.error);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching catchup tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchCatchupTasks();
    }
  }, [visible, fetchCatchupTasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCatchupTasks();
  }, [fetchCatchupTasks]);

  const handleCompleteTask = useCallback(async (task) => {
    Alert.alert(
      'Complete Catch-up Task',
      `Mark catch-up collection for ${task.resident_name} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const token = await getToken();
              const collectorId = await getCollectorId();
              
              if (!token || !collectorId) {
                Alert.alert('Auth Error', 'Missing session. Please re-login.');
                return;
              }

              setCompletingTaskId(task.task_id);

              const response = await fetch(
                `${API_BASE_URL}/api/enhanced-missed-collection/catchup-tasks/complete`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    task_id: task.task_id,
                    collector_id: collectorId,
                    completion_notes: `Catch-up completed at ${new Date().toLocaleString()}`
                  })
                }
              );

              const data = await response.json();

              if (response.ok && data.success) {
                Alert.alert('Success', 'Catch-up task completed successfully!');
                // Remove completed task from local state
                setTasks(prev => prev.filter(t => t.task_id !== task.task_id));
              } else {
                Alert.alert('Error', data.error || 'Failed to complete catch-up task');
              }
            } catch (error) {
              console.error('Error completing catchup task:', error);
              Alert.alert('Error', 'Failed to complete catch-up task');
            } finally {
              setCompletingTaskId(null);
            }
          }
        }
      ]
    );
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3: return '#f44336'; // High priority - red
      case 2: return '#ff9800'; // Medium priority - orange
      case 1: return '#4caf50'; // Low priority - green
      default: return '#757575'; // Default - gray
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 3: return 'HIGH';
      case 2: return 'MEDIUM';
      case 1: return 'LOW';
      default: return 'NORMAL';
    }
  };

  const getIssueIcon = (issueType) => {
    switch (issueType) {
      case 'truck_breakdown': return 'car-outline';
      case 'equipment_failure': return 'construct-outline';
      case 'route_blocked': return 'close-circle-outline';
      case 'weather_conditions': return 'rainy-outline';
      case 'collector_emergency': return 'medical-outline';
      case 'fuel_shortage': return 'battery-dead-outline';
      case 'safety_concern': return 'shield-outline';
      default: return 'alert-circle-outline';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catch-up Tasks</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>Loading catch-up tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#4caf50" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              No pending catch-up tasks. Great work!
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {tasks.length} catch-up task{tasks.length !== 1 ? 's' : ''} pending
              </Text>
              {tasks.filter(t => t.is_overdue).length > 0 && (
                <Text style={styles.overdueText}>
                  {tasks.filter(t => t.is_overdue).length} overdue
                </Text>
              )}
            </View>

            {tasks.map((task) => (
              <View key={task.task_id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskInfo}>
                    <Text style={styles.residentName}>{task.resident_name}</Text>
                    <Text style={styles.taskAddress}>{task.address}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                    <Text style={styles.priorityText}>{getPriorityText(task.priority)}</Text>
                  </View>
                </View>

                <View style={styles.taskDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name={getIssueIcon(task.issue_type)} size={16} color="#666" />
                    <Text style={styles.detailText}>{task.issue_description}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={[
                      styles.detailText,
                      task.is_overdue && styles.overdueDate
                    ]}>
                      Due: {new Date(task.scheduled_date).toLocaleDateString()}
                      {task.is_overdue && ' (OVERDUE)'}
                    </Text>
                  </View>

                  {task.days_until_due !== null && !task.is_overdue && (
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {task.days_until_due === 0 ? 'Due today' : 
                         task.days_until_due === 1 ? 'Due tomorrow' :
                         `Due in ${task.days_until_due} days`}
                      </Text>
                    </View>
                  )}

                  {task.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>{task.notes}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    completingTaskId === task.task_id && styles.completingButton
                  ]}
                  onPress={() => handleCompleteTask(task)}
                  disabled={completingTaskId === task.task_id}
                >
                  {completingTaskId === task.task_id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.completeButtonText}>Mark Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  overdueText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: 'bold',
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  taskAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  taskDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  overdueDate: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  completingButton: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CatchupTasksDisplay;
