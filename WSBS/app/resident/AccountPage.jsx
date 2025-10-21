import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getToken } from '../auth';
import { API_BASE_URL } from '../config';

const AccountPage = () => {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

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

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        Alert.alert('Success', 'Profile picture updated! (Note: This is stored locally for demo purposes)');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear the token from secure storage
              const { logout } = require('../auth');
              await logout();
              router.replace('/role');
            } catch (error) {
              console.error('Logout error:', error);
              // Force navigation even if logout fails
              router.replace('/role');
            }
          }
        }
      ]
    );
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
          <TouchableOpacity style={styles.profilePictureWrapper} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Ionicons name="person" size={50} color="#999" />
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileText}>Tap to change photo</Text>
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.editButton} onPress={() => Alert.alert('Edit Profile', 'Profile editing feature coming soon!')}>
            <Ionicons name="create-outline" size={20} color="#4CD964" style={{ marginRight: 8 }} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
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
  profilePictureWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  profilePicturePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CD964',
    borderStyle: 'dashed',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CD964',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
  buttonContainer: {
    marginTop: 30,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CD964',
  },
  editButtonText: {
    color: '#4CD964',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AccountPage;
