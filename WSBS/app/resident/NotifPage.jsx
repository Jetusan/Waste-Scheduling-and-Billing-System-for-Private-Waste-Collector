import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getToken } from '../auth';

export default function NotifPage() {
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const renderItem = ({ item }) => (
    <View style={styles.notificationItem}>
      <View style={styles.avatar}>
        <Ionicons name={item.is_read ? 'notifications-outline' : 'notifications'} size={22} color="#4CD964" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>{item.title || 'Notification'}</Text>
        <Text style={styles.timeText}>{item.message}</Text>
      </View>
      {!item.is_read && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>New</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

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
});
