import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomePage() {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, Jim</Text>
        <Image
          style={styles.profileImage}
          source={{ uri: 'https://via.placeholder.com/50' }} // Replace with actual image URL
        />
        <Ionicons name="settings-outline" size={24} color="black" style={styles.settingsIcon} />
      </View>

      {/* Services Section */}
      <Text style={styles.servicesTitle}>Choose your services</Text>
      <View style={styles.servicesContainer}>
        <Pressable style={styles.serviceButton}>
          <Ionicons name="calendar-outline" size={32} color="#4CD964" />
          <Text style={styles.serviceText}>Schedule</Text>
        </Pressable>
        <Pressable style={styles.serviceButton}>
          <Ionicons name="add-circle-outline" size={32} color="#4CD964" />
          <Text style={styles.serviceText}>Special Pickup</Text>
        </Pressable>
        <Pressable style={styles.serviceButton}>
          <Ionicons name="pricetag-outline" size={32} color="#4CD964" />
          <Text style={styles.serviceText}>Subscriptions</Text>
        </Pressable>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navButton}>
          <Ionicons name="home-outline" size={24} color="#4CD964" />
          <Text style={styles.navText}>Home</Text>
        </Pressable>
        <Pressable style={styles.navButton}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.navText}>Notification</Text>
        </Pressable>
        <Pressable style={styles.navButton}>
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.navText}>Feedback</Text>
        </Pressable>
        <Pressable style={styles.navButton}>
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Account</Text>
        </Pressable>
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
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  settingsIcon: {
    marginLeft: 10,
  },
  servicesTitle: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  servicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 400,
  },
  serviceButton: {
    alignItems: 'center',
  },
  serviceText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  navButton: {
    alignItems: 'center',
  },
  navText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
});