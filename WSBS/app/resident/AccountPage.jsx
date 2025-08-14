import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from '../auth';
import { API_BASE_URL } from '../config';

const AccountPage = () => {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        console.log('Retrieved token:', token ? 'Token exists' : 'No token found');
        
        if (!token) {
          setError('No authentication token found. Please log in again.');
          setLoading(false);
          return;
        }
        
        console.log('Using JWT token for profile fetch');
        
        // Use the standard profile endpoint with JWT token
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('HTTP error:', response.status);
          setError(`Failed to fetch profile (HTTP ${response.status})`);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Profile data received:', data);
        
        if (!data.success) {
          setError(data.message || 'Failed to fetch profile');
        } else {
          setProfile(data.user);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message || 'An error occurred while fetching profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      // Clear the token from secure storage
      const { logout } = require('../auth');
      await logout();
      router.replace('/RLogin');
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if logout fails
      router.replace('/RLogin');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Your Profile</Text>

        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture} />
          <Text style={styles.profileText}>Profile Picture</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.infoText}>
            {profile ? profile.name || `${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() : 'Loading...'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.infoText}>
            {profile ? profile.username || 'N/A' : 'Loading...'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Contact Number</Text>
          <Text style={styles.infoText}>
            {profile ? profile.phone || 'N/A' : 'Loading...'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Street</Text>
          <Text style={styles.infoText}>
            {profile ? profile.address?.street || 'N/A' : 'Loading...'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Barangay</Text>
          <Text style={styles.infoText}>
            {profile ? profile.address?.barangay || 'N/A' : 'Loading...'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>City</Text>
          <Text style={styles.infoText}>
            {profile ? profile.address?.city || 'N/A' : 'Loading...'}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FAFAFA',
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#C0C0C0',
    marginBottom: 10,
  },
  profileText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    minHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    width: 180,
    alignSelf: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AccountPage;
