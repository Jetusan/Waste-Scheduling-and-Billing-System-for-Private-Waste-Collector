import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';

// Note: Use API_BASE_URL for any future fetches

const CSchedule = () => {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');

  // Example schedule data (you can replace this with real API data)
  const schedules = [
    {
      id: 'CL-002',
      location: 'Agan Ligaya',
      truck: 'TR-001',
      date: 'August 1, 2024',
      time: '08:00 AM',
    },
    {
      id: 'CL-001',
      location: 'Agan Laggao',
      truck: 'TR-002',
      date: 'August 1, 2024',
      time: '08:00 AM',
    },
    {
      id: 'WC-003',
      location: 'East District',
      team: 'Team Gamma',
      day: 'Wednesday',
      time: '07:00 AM',
    },
    {
      id: 'WC-004',
      location: 'West District',
      team: 'Team Delta',
      day: 'Thursday',
      time: '10:00 AM',
    },
    {
      id: 'WC-005',
      location: 'Central District',
      team: 'Team Epsilon',
      day: 'Friday',
      time: '08:30 AM',
    },
  ];

  // Filter by search text (optional)
  const filteredSchedules = schedules.filter((item) =>
    item.location.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Waste Collection Schedule</Text>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search schedules..."
          value={searchText}
          onChangeText={setSearchText}
          style={{ flex: 1 }}
        />
      </View>

      {/* Schedule List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredSchedules.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.id}</Text>
            <Text>{item.location}</Text>
            {item.truck && <Text>{item.truck}</Text>}
            {item.date && <Text>{item.date}</Text>}
            {item.day && <Text>{item.day}</Text>}
            <Text>{item.time}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default CSchedule;

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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
