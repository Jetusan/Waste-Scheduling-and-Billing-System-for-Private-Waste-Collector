import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { getToken, getUserId, logout } from './auth';
import { API_BASE_URL } from './config';

const SPickup = () => {
  const router = useRouter();
  const [wasteType, setWasteType] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Location states
  const [pickupLocation, setPickupLocation] = useState(null); // { latitude, longitude, address }
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  // New states for preview mode
  const [showForm, setShowForm] = useState(false);
  const [specialRequests, setSpecialRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Handle authentication errors
  const handleAuthError = async () => {
    console.log('🔑 Clearing authentication and redirecting to login...');
    await logout();
    Alert.alert(
      'Session Expired',
      'Please log in again to continue.',
      [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/resident/Login');
          }
        }
      ],
      { cancelable: false }
    );
  };

  // Get current user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = await getToken();
        
        if (!token) {
          Alert.alert('Authentication Error', 'No authentication token found. Please log in again.');
          return;
        }

        // Always get user info from profile API for most reliable data
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Profile API response:', data);
          
          if (data.success && data.user) {
            setUserProfile(data.user);
            
            // Set user ID from profile response (most reliable source)
            const userId = data.user.user_id || data.user.id;
            if (userId) {
              console.log('Setting user ID from profile:', userId);
              setCurrentUserId(userId);
              
              // Update storage with correct user ID
              const { saveAuth, getRole } = require('./auth');
              const userRole = await getRole() || 'resident';
              await saveAuth(token, userRole, userId);
            } else {
              console.error('No user ID found in profile response');
            }
            
            // Pre-fill address if available
            if (data.user.full_address) {
              setAddress(data.user.full_address);
            }
          } else {
            console.error('Profile API returned unsuccessful response:', data);
            Alert.alert('Authentication Error', 'Unable to fetch user profile. Please log in again.');
          }
        } else {
          console.error('Profile API request failed:', response.status);
          // Don't show alert for server errors, just log and continue
          // The user can still use the special pickup feature
          if (response.status >= 500) {
            console.warn('Server error, continuing without profile data');
          } else if (response.status === 401) {
            console.warn('Authentication error - clearing auth and redirecting to login');
            await handleAuthError();
            return;
          } else {
            Alert.alert('Authentication Error', 'Unable to verify user authentication. Please log in again.');
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Don't show alert for network errors, just log and continue
        // The user can still use the special pickup feature
        console.warn('Network error, continuing without profile data');
        
        // Try to get user ID from storage as fallback
        try {
          const fallbackUserId = await getUserId();
          if (fallbackUserId) {
            console.log('Using fallback user ID from storage:', fallbackUserId);
            setCurrentUserId(fallbackUserId);
          }
        } catch (fallbackError) {
          console.error('Failed to get fallback user ID:', fallbackError);
        }
      }
    };

    fetchUserInfo();
  }, []);

  // Function to fetch user's special pickup requests
  const fetchSpecialRequests = async () => {
    try {
      setRequestsLoading(true);
      const token = await getToken();
      const userId = await getUserId();
      
      if (!token || !userId) {
        setSpecialRequests([]);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(userId);

      console.log('🔄 Fetching special requests for user:', userId);
      console.log('🔄 API URL:', `${API_BASE_URL}/api/special-pickup/user/${userId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/special-pickup/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔄 Special requests response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Special requests data:', data);
        // Backend returns array directly, not wrapped in { requests: [] }
        setSpecialRequests(Array.isArray(data) ? data : []);
      } else {
        console.warn(`Special requests API failed with status: ${response.status}`);
        setSpecialRequests([]);
        // Don't show error for server issues, just log
        if (response.status >= 500) {
          console.warn('Server error when fetching special requests');
        } else if (response.status === 401) {
          console.warn('Authentication error when fetching special requests');
          await handleAuthError();
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching special requests:', err);
      console.warn('Network error when fetching special requests, showing empty list');
      setSpecialRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Fetch requests on component mount
  useEffect(() => {
    fetchSpecialRequests();
    checkLocationPermission();
  }, []);

  // Check location permission on component mount
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  // Get current location for pickup
  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      // Request permission if not granted
      if (!locationPermissionGranted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Location permission is needed to set pickup location. You can still enter the address manually.',
            [
              { text: 'OK', style: 'default' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }
              }
            ]
          );
          return;
        }
        setLocationPermissionGranted(true);
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      let formattedAddress = 'Current Location';
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        formattedAddress = `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}`
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*|,\s*$/g, '')
          .trim();
      }

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress
      };

      setPickupLocation(locationData);
      setAddress(formattedAddress);
      
      Alert.alert('Success', 'Location set successfully!');
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get current location. Please enter the address manually or try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Clear selected location
  const clearLocation = () => {
    setPickupLocation(null);
    setAddress('');
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!wasteType || !description || !date || !time || !address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!currentUserId) {
      console.log('No currentUserId available, attempting to fetch...');
      
      // Try to get user ID one more time before failing
      try {
        const token = await getToken();
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              const userId = data.user.user_id || data.user.id;
              if (userId) {
                setCurrentUserId(userId);
                console.log('Successfully retrieved user ID:', userId);
                // Continue with submission by calling handleSubmit again
                setTimeout(() => handleSubmit(), 100);
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to retrieve user ID:', error);
      }
      
      Alert.alert(
        'Authentication Error', 
        'Unable to identify user. Please log out and log back in to fix this issue.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('waste_type', wasteType);
      formData.append('description', description);
      formData.append('pickup_date', date ? date.toISOString().split('T')[0] : '');
      formData.append('pickup_time', time ? time.toTimeString().split(' ')[0].substring(0, 5) : '');
      formData.append('address', address);
      formData.append('notes', notes);
      formData.append('message', message);
      
      // Add GPS coordinates if available
      if (pickupLocation) {
        formData.append('pickup_latitude', pickupLocation.latitude.toString());
        formData.append('pickup_longitude', pickupLocation.longitude.toString());
      }

      // Add image if selected
      if (image) {
        const imageUri = image;
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      console.log('Sending request with FormData');

      const response = await fetch(`${API_BASE_URL}/api/special-pickup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the browser set it with boundary
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success', 
          'Special pickup request submitted successfully! The admin will review your request and assign a collector.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setWasteType('');
                setDescription('');
                setDate('');
                setTime('');
                setAddress('');
                setNotes('');
                setMessage('');
                setImage(null);
                
                // Go back to requests list and refresh
                setShowForm(false);
                fetchSpecialRequests();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    // Ask permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Modern Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/resident/HomePage')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {showForm ? 'New Special Pickup' : 'Special Pickup'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {showForm ? 'Schedule a custom waste collection' : 'Your special pickup requests'}
            </Text>
          </View>

          {!showForm && (
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => {
                console.log('🔄 Refreshing special pickup requests...');
                fetchSpecialRequests();
              }}
            >
              <Ionicons name="refresh-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {!showForm ? (
        // Preview Mode - Show user's special pickup requests
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Your Special Pickup Requests</Text>
            
            {requestsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading your requests...</Text>
              </View>
            ) : specialRequests.length > 0 ? (
              specialRequests.map((request) => (
                <View key={request.request_id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestStatus}>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: 
                          request.status === 'completed' ? '#4CAF50' :
                          request.status === 'in_progress' ? '#FF9800' :
                          request.status === 'approved' ? '#2196F3' :
                          '#9E9E9E'
                        }
                      ]} />
                      <Text style={styles.statusText}>
                        {request.status === 'completed' ? 'Completed' :
                         request.status === 'in_progress' ? 'In Progress' :
                         request.status === 'approved' ? 'Approved' :
                         request.status === 'pending' ? 'Pending' :
                         'Unknown'}
                      </Text>
                    </View>
                    <Text style={styles.requestDate}>
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>

                  <Text style={styles.requestWasteType}>{request.waste_type}</Text>
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {request.description}
                  </Text>
                  
                  {request.final_price && (
                    <View style={styles.priceContainer}>
                      <Ionicons name="pricetag" size={16} color="#4CAF50" />
                      <Text style={styles.priceText}>₱{request.final_price}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Special Requests</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't made any special pickup requests yet.
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.newRequestButton}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.newRequestText}>New Special Pickup Request</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // Form Mode - Original form
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity 
            style={styles.backToRequestsButton}
            onPress={() => setShowForm(false)}
          >
            <Ionicons name="arrow-back" size={16} color="#4CAF50" />
            <Text style={styles.backToRequestsText}>Back to My Requests</Text>
          </TouchableOpacity>
        {/* Waste Type Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trash-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Waste Type</Text>
          </View>
          <View style={styles.buttonGroup}>
            {[
              { type: 'Bulky', icon: 'cube-outline' },
              { type: 'Electronics', icon: 'laptop-outline' },
              { type: 'Hazardous', icon: 'warning-outline' },
              { type: 'Other', icon: 'ellipsis-horizontal-outline' }
            ].map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.typeButton,
                  wasteType === item.type && styles.activeButton
                ]}
                onPress={() => setWasteType(item.type)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={item.icon} 
                  size={20} 
                  color={wasteType === item.type ? '#fff' : '#4CAF50'} 
                />
                <Text style={[styles.buttonText, wasteType === item.type && styles.activeButtonText]}>
                  {item.type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="e.g., Old sofa, broken refrigerator"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Pickup Schedule</Text>
          </View>
          
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeIconContainer}>
              <Ionicons name="calendar" size={22} color="#4CAF50" />
            </View>
            <View style={styles.dateTimeTextContainer}>
              <Text style={styles.dateTimeLabel}>Pickup Date</Text>
              <Text style={styles.dateTimeValue}>
                {date ? date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select a date'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeIconContainer}>
              <Ionicons name="time" size={22} color="#4CAF50" />
            </View>
            <View style={styles.dateTimeTextContainer}>
              <Text style={styles.dateTimeLabel}>Pickup Time</Text>
              <Text style={styles.dateTimeValue}>
                {time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Select a time'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={time || new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                setTime(selectedTime);
              }
            }}
          />
        )}

        {/* Address Section with Location Picker */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Pickup Location</Text>
          </View>
          
          {/* Location Status Display */}
          {pickupLocation && (
            <View style={styles.locationStatusContainer}>
              <View style={styles.locationStatusHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.locationStatusText}>GPS Location Set</Text>
                <TouchableOpacity onPress={clearLocation} style={styles.clearLocationButton}>
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
              <Text style={styles.coordinatesText}>
                📍 {pickupLocation.latitude.toFixed(6)}, {pickupLocation.longitude.toFixed(6)}
              </Text>
            </View>
          )}
          
          {/* Location Action Buttons */}
          <View style={styles.locationButtonsContainer}>
            <TouchableOpacity
              style={[styles.locationButton, isGettingLocation && styles.locationButtonDisabled]}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
              activeOpacity={0.7}
            >
              {isGettingLocation ? (
                <>
                  <Ionicons name="hourglass-outline" size={20} color="#fff" />
                  <Text style={styles.locationButtonText}>Getting Location...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="#fff" />
                  <Text style={styles.locationButtonText}>Use Current Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Address Input */}
          <View style={styles.inputContainer}>
            <TextInput
              placeholder={pickupLocation ? "Address (auto-filled from GPS)" : "Or enter address manually"}
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              multiline
            />
          </View>
          
          <Text style={styles.locationHelpText}>
            💡 Use GPS for accurate location or enter address manually
          </Text>
        </View>

        {/* Special Instructions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbox-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Special Instructions</Text>
          </View>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              placeholder="Any special instructions or notes for the collector?"
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Image Upload Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="image-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Photo (Optional)</Text>
          </View>
          
          {!image ? (
            <TouchableOpacity 
              onPress={pickImage} 
              style={styles.imagePickerButton}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={32} color="#4CAF50" />
              <Text style={styles.imagePickerButtonText}>Upload Photo</Text>
              <Text style={styles.imagePickerSubtext}>Tap to select an image</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity 
                onPress={pickImage} 
                style={styles.changeImageButton}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setImage(null)} 
                style={styles.removeImageButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color="#ff4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <>
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Request Pickup</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  typeButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  buttonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeButtonText: {
    color: '#fff',
  },
  inputContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  input: {
    padding: 14,
    fontSize: 15,
    color: '#2c3e50',
  },
  textAreaContainer: {
    minHeight: 100,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateTimeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
  },
  imagePickerButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  imagePickerButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  imagePickerSubtext: {
    color: '#95a5a6',
    fontSize: 13,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 20,
  },
  // New styles for preview mode
  previewSection: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
  },
  requestWasteType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  newRequestButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newRequestText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backToRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  backToRequestsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Location picker styles
  locationStatusContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  locationStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationStatusText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  clearLocationButton: {
    padding: 4,
  },
  coordinatesText: {
    color: '#2e7d32',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationButtonsContainer: {
    marginTop: 12,
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButtonDisabled: {
    backgroundColor: '#95a5a6',
    shadowOpacity: 0,
    elevation: 0,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationHelpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SPickup;
