import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotifPage() {
  const notifications = [
    {
      id: '1',
      message: 'Your waste pickup is scheduled for tomorrow at 7:00 AM.',
      time: '2m ago',
      count: 1,
      icon: 'ios-trash-bin',
    },
    {
      id: '2',
      message: 'New collection route assigned for your area. Check the updated schedule.',
      time: '10m ago',
      count: 2,
      icon: 'map-outline',
    },
    {
      id: '3',
      message: 'Billing reminder: Your monthly waste collection fee is due.',
      time: '30m ago',
      count: 1,
      icon: 'card-outline',
    },
    {
      id: '4',
      message: 'Waste collection completed successfully in your area.',
      time: '1h ago',
      count: 0,
      icon: 'checkmark-done-outline',
    },
    {
      id: '5',
      message: 'Promo: Refer a neighbor and get 10% off your next bill!',
      time: '3h ago',
      count: 0,
      icon: 'gift-outline',
    },
    {
      id: '6',
      message: 'Important: Collection delays expected tomorrow due to road repairs.',
      time: '5h ago',
      count: 1,
      icon: 'alert-circle-outline',
    },
    {
      id: '7',
      message: 'You earned 5 eco points for segregating your waste properly!',
      time: '8h ago',
      count: 0,
      icon: 'leaf-outline',
    },
    {
      id: '8',
      message: 'Thank you for your payment of ₱350.00 for this month’s waste services.',
      time: '12h ago',
      count: 0,
      icon: 'cash-outline',
    },
    {
      id: '9',
      message: 'New recycling program launched! Join and earn extra eco points.',
      time: '1d ago',
      count: 1,
      icon: 'recycle-outline',
    },
    {
      id: '10',
      message: 'Survey: Rate our waste collection services and help us improve.',
      time: '2d ago',
      count: 0,
      icon: 'chatbubble-ellipses-outline',
    },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.notificationItem}>
      <View style={styles.avatar}>
        <Ionicons name={item.icon} size={22} color="#4CD964" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>{item.message}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
      {item.count > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.count}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Ionicons name="settings-outline" size={24} color="#fff" />
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.notificationList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
