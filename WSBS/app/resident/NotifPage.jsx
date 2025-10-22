import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import { getToken } from '../auth';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../contexts/NotificationContext';

export default function NotifPage() {
  const { isConnected, subscribe } = useWebSocket();
  const { decreaseUnreadCount, resetUnreadCount, fetchUnreadCount } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      } else {
        setError(data?.message || 'Failed to load notifications');
      }
    } catch (e) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh notifications when page is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔔 NotifPage focused - refreshing notifications');
      fetchNotifications();
    }, [fetchNotifications])
  );

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = subscribe('notification', (data) => {
      console.log('🔔 Real-time notification received:', data);
      
      // Add new notification to the top of the list
      const newNotification = {
        notification_id: Date.now(), // Temporary ID
        title: data.title,
        message: data.message,
        notification_type: data.type,
        is_read: false,
        created_at: data.timestamp,
        icon: data.icon || 'notifications',
        color: data.color || '#4CAF50'
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show alert for important notifications
      if (data.type === 'collection_completed') {
        Alert.alert(data.title, data.message);
      }
    });

    return () => unsubscribe();
  }, [subscribe]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      const token = await getToken();
      if (!token) return;
      
      // Optimistically update UI and decrease unread count
      setNotifications((prev) => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
      decreaseUnreadCount(1);
      
      const res = await fetch(`${API_BASE_URL}/api/notifications/me/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        // If API call failed, revert the optimistic update
        setNotifications((prev) => prev.map(n => n.notification_id === id ? { ...n, is_read: false } : n));
        fetchUnreadCount(true); // Force refresh the count
      }
    } catch (_) {
      // If error, revert optimistic update and refresh count
      setNotifications((prev) => prev.map(n => n.notification_id === id ? { ...n, is_read: false } : n));
      fetchUnreadCount(true);
    }
  }, [decreaseUnreadCount, fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.notification_id);
    if (unreadIds.length === 0) return;
    
    // Optimistic UI update and reset unread count
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    resetUnreadCount();
    
    try {
      const token = await getToken();
      if (!token) return;
      await Promise.all(
        unreadIds.map(id => fetch(`${API_BASE_URL}/api/notifications/me/${id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }))
      );
    } catch (_) {
      // On failure, refetch to sync state
      fetchNotifications();
      fetchUnreadCount(true); // Force refresh the count
    }
  }, [notifications, fetchNotifications, resetUnreadCount, fetchUnreadCount]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        if (!item.is_read) markAsRead(item.notification_id);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.notificationItem}>
        <View style={styles.avatar}>
          <Ionicons name={item.is_read ? 'notifications-outline' : 'notifications'} size={22} color="#4CD964" />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{item.title || 'Notification'}</Text>
          <Text style={styles.timeText}>{item.message}</Text>
        </View>
        {!item.is_read ? (
          <TouchableOpacity style={[styles.badgeContainer, { backgroundColor: '#FF3B30' }]} onPress={() => markAsRead(item.notification_id)}>
            <Text style={styles.badgeText}>Mark read</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.badgeContainer, { backgroundColor: '#E0E0E0' }]}> 
            <Text style={[styles.badgeText, { color: '#555' }]}>Read</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {isConnected && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
      </View>

      {/* Mark all as read action */}
      {notifications.some(n => !n.is_read) && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <TouchableOpacity onPress={markAllAsRead} style={{ alignSelf: 'flex-start', backgroundColor: '#4CD964', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification List */}
      {loading ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="small" color="#4CD964" />
        </View>
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#c62828' }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.notification_id)}
          contentContainerStyle={styles.notificationList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={{ color: '#666', padding: 20 }}>No notifications yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#4CD964',
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
  },
  notificationList: {
    padding: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  badgeContainer: {
    backgroundColor: '#FF3B30',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 12,
  },
  liveBadge: {
    position: 'absolute',
    top: 32,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
