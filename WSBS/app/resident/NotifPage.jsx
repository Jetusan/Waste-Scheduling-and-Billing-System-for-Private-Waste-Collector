import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotifPage() {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Notification</Text>
        <Ionicons name="settings-outline" size={24} color="black" style={styles.settingsIcon} />
      </View>

      {/* Notification List */}
      <View style={styles.notificationList}>
        {[1, 2, 3, 4, 5].map((item, index) => (
          <View key={index} style={styles.notificationItem}>
            <View style={styles.avatar} />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Text>
              <Text style={styles.timeText}>1m ago</Text>
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{item % 2 === 0 ? 2 : 1}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CD964',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsIcon: {
    marginLeft: 10,
  },
  notificationList: {
    padding: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  badgeContainer: {
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});