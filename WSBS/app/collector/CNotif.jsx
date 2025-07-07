import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CNotif = () => {
  const router = useRouter();

  // Example notifications (mock)
  const notifications = [
    {
      id: 1,
      icon: 'notifications',
      title: 'New Collection Schedule Assigned',
      message: 'Route B12 scheduled for tomorrow at 8:00 AM',
      time: '2m ago',
      color: '#4CAF50', // green
    },
    {
      id: 2,
      icon: 'navigate',
      title: 'Route Updated',
      message: 'Changes made to your afternoon route',
      time: '15m ago',
      color: '#4CAF50',
    },
    {
      id: 3,
      icon: 'alert-circle',
      title: 'Missed Collection Alert',
      message: '123 Oak Street was missed today',
      time: '1h ago',
      color: '#B0BEC5', // gray
    },
    {
      id: 4,
      icon: 'document-text',
      title: 'Weekly Report Available',
      message: 'View your performance metrics',
      time: '2h ago',
      color: '#B0BEC5',
    },
    {
      id: 5,
      icon: 'construct',
      title: 'Vehicle Maintenance Due',
      message: 'Schedule service for Truck #247',
      time: '3h ago',
      color: '#B0BEC5',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.push('/collector/CHome')} style={styles.backButton}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      {/* Page Title */}
      <Text style={styles.title}>Notifications</Text>

      {/* Notification List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {notifications.map((item) => (
          <View key={item.id} style={styles.notificationCard}>
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={20} color="#fff" />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.rowBetween}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.notificationMessage}>{item.message}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default CNotif;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#007bff',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  notificationMessage: {
    color: '#555',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#888',
  },
});
