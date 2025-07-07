import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CSettings = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header with Back Button and Title */}
                <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Settings</Text>

          <View style={{ width: 24 }} />  {/* Invisible spacer for alignment */}
        </View>


        {/* Settings List */}
        <TouchableOpacity style={styles.settingItem}>
          <Feather name="user" size={20} color="#333" />
          <Text style={styles.settingText}>Profile Information</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Feather name="lock" size={20} color="#333" />
          <Text style={styles.settingText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Feather name="bell" size={20} color="#333" />
          <Text style={styles.settingText}>Notification Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Feather name="info" size={20} color="#333" />
          <Text style={styles.settingText}>About App</Text>
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/collector/CLogin')}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

export default CSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
  paddingHorizontal: 16,  // Optional, if your layout uses padding
},
pageTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  textAlign: 'center',
  flex: 1,
},


  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: '#e53935',
    padding: 14,
    borderRadius: 8,
    marginTop: 32,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
