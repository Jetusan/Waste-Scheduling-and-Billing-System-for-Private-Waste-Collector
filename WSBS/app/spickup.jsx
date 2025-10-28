import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { getToken, getUserId, logout } from './auth';
import { extractUserId, formatUserIdForAPI, isValidUserId, USER_ID_ERRORS } from './utils/userIdStandardization';
import { API_BASE_URL } from './config';
import RequestChatSection from './components/RequestChatSection';
import BagQuantitySelector from '../components/BagQuantitySelector';
import SmartDatePicker from './components/SmartDatePicker';

const SPickup = () => {
  const router = useRouter();
  const [wasteTypes, setWasteTypes] = useState([]); // Changed to array for multiple selection
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [bagQuantity, setBagQuantity] = useState(1); // New state for bag quantity
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
  const [expandedChat, setExpandedChat] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [requestsLoading, setRequestsLoading] = useState(true);
  
  // Map states
  const [mapRef, setMapRef] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
            
            // Set user ID using standardized extraction
            const userId = extractUserId(data.user);
            if (isValidUserId(userId)) {
              console.log('Setting standardized user ID from profile:', userId);
              setCurrentUserId(formatUserIdForAPI(userId));
              
              // Update storage with correct user ID
              const { saveAuth, getRole } = require('./auth');
              const userRole = await getRole() || 'resident';
              await saveAuth(token, userRole, userId);
            } else {
              console.error('No valid user ID found in profile response:', data.user);
              Alert.alert('Authentication Error', USER_ID_ERRORS.NOT_FOUND);
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

  // Function to check unread messages for all requests (optimized)
  const checkUnreadMessages = async (requests) => {
    try {
      const token = await getToken();
      const userId = await getUserId();
      
      if (!token || !userId || requests.length === 0) {
        return;
      }
      
      const unreadCounts = {};
      
      // Use Promise.all for parallel processing (faster)
      const unreadPromises = requests.map(async (request) => {
        try {
          // Get or create chat for this request
          const chatResponse = await fetch(`${API_BASE_URL}/api/chat/request/${request.request_id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            const chatId = chatData.chat?.chat_id;
            
            if (chatId) {
              // Get unread message count
              const unreadResponse = await fetch(`${API_BASE_URL}/api/chat/${chatId}/unread-count?user_id=${userId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (unreadResponse.ok) {
                const unreadData = await unreadResponse.json();
                return { requestId: request.request_id, count: unreadData.count || 0 };
              }
            }
          }
          return { requestId: request.request_id, count: 0 };
        } catch (error) {
          console.error(`Error checking unread for request ${request.request_id}:`, error);
          return { requestId: request.request_id, count: 0 };
        }
      });
      
      // Wait for all requests to complete
      const results = await Promise.all(unreadPromises);
      
      // Build unread counts object
      results.forEach(result => {
        unreadCounts[result.requestId] = result.count;
      });
      
      setUnreadMessages(unreadCounts);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

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
        const requestsArray = Array.isArray(data) ? data : [];
        setSpecialRequests(requestsArray);
        // Check unread messages after fetching requests
        await checkUnreadMessages(requestsArray);
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
    if (wasteTypes.length === 0 || !description || !date || !address) {
      Alert.alert('Error', 'Please select at least one waste type and fill in all required fields');
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
      formData.append('waste_type', wasteTypes.join(', ')); // Join multiple waste types with comma
      formData.append('description', description);
      formData.append('pickup_date', date ? date.toISOString().split('T')[0] : '');
      formData.append('address', address);
      formData.append('bag_quantity', bagQuantity.toString());
      formData.append('estimated_total', (bagQuantity * 25).toString());
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
                setWasteTypes([]);
                setDescription('');
                setDate(null);
                setAddress('');
                setNotes('');
                setMessage('');
                setImage(null);
                setPickupLocation(null);
                
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
              onPress={async () => {
                console.log('🔄 Refreshing special pickup requests...');
                await fetchSpecialRequests();
              }}
            >
              <Ionicons name="refresh-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Working Hours Notice */}
      <View style={styles.workingHoursNotice}>
        <View style={styles.noticeIcon}>
          <Ionicons name="time-outline" size={20} color="#856404" />
        </View>
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>Notice</Text>
          <Text style={styles.noticeText}>
            Working hours of WSBS is <Text style={styles.noticeTextBold}>6AM to 6PM</Text>.
          </Text>
        </View>
      </View>

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
                      <Ionicons 
                        name={
                          request.status === 'collected' ? 'checkmark-circle' :
                          request.status === 'completed' ? 'checkmark-circle' :
                          request.status === 'in_progress' ? 'time' :
                          request.status === 'assigned' ? 'person' :
                          request.status === 'pending' ? 'hourglass' :
                          request.status === 'cancelled' ? 'close-circle' :
                          request.status === 'missed' ? 'alert-circle' :
                          'help-circle'
                        }
                        size={16}
                        color={
                          request.status === 'collected' ? '#4CAF50' :
                          request.status === 'completed' ? '#4CAF50' :
                          request.status === 'in_progress' ? '#FF9800' :
                          request.status === 'assigned' ? '#2196F3' :
                          request.status === 'pending' ? '#9E9E9E' :
                          request.status === 'cancelled' ? '#F44336' :
                          request.status === 'missed' ? '#FF5722' :
                          '#9E9E9E'
                        }
                      />
                      <Text style={[
                        styles.statusText,
                        { color: 
                          request.status === 'collected' ? '#4CAF50' :
                          request.status === 'completed' ? '#4CAF50' :
                          request.status === 'in_progress' ? '#FF9800' :
                          request.status === 'assigned' ? '#2196F3' :
                          request.status === 'pending' ? '#9E9E9E' :
                          request.status === 'cancelled' ? '#F44336' :
                          request.status === 'missed' ? '#FF5722' :
                          '#9E9E9E'
                        }
                      ]}>
                        {request.status === 'collected' ? 'Collected ✓' :
                         request.status === 'completed' ? 'Completed ✓' :
                         request.status === 'in_progress' ? 'In Progress' :
                         request.status === 'assigned' ? 'Assigned to Collector' :
                         request.status === 'pending' ? 'Pending Review' :
                         request.status === 'cancelled' ? 'Cancelled' :
                         request.status === 'missed' ? 'Missed Pickup' :
                         `Status: ${request.status}`}
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
                  
                  {/* Bag Quantity Display */}
                  {request.bag_quantity && (
                    <View style={styles.bagQuantityContainer}>
                      <Ionicons name="bag-outline" size={16} color="#666" />
                      <Text style={styles.bagQuantityText}>
                        {request.bag_quantity} {request.bag_quantity === 1 ? 'bag' : 'bags'} × ₱25
                      </Text>
                    </View>
                  )}
                  
                  {/* Price Display */}
                  {(request.final_price || request.estimated_total) && (
                    <View style={styles.priceContainer}>
                      <Ionicons name="pricetag" size={16} color="#4CAF50" />
                      <Text style={styles.priceText}>
                        {request.final_price ? `₱${request.final_price}` : `₱${request.estimated_total} (estimated)`}
                      </Text>
                    </View>
                  )}
                  
                  {/* Chat Section */}
                  <RequestChatSection 
                    requestId={request.request_id}
                    isExpanded={expandedChat === request.request_id}
                    unreadCount={unreadMessages[request.request_id] || 0}
                    onToggle={() => setExpandedChat(
                      expandedChat === request.request_id ? null : request.request_id
                    )}
                  />
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
        {/* Waste Type Section - Multi-Select */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trash-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Waste Type (Select One or More)</Text>
          </View>
          <View style={styles.buttonGroup}>
            {[
              { type: 'Non-Biodegradable', icon: 'cube-outline' },
              { type: 'Biodegradable', icon: 'leaf-outline' },
              { type: 'Recyclable', icon: 'refresh-outline' }
            ].map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.typeButton,
                  wasteTypes.includes(item.type) && styles.activeButton
                ]}
                onPress={() => {
                  if (wasteTypes.includes(item.type)) {
                    // Remove if already selected
                    setWasteTypes(wasteTypes.filter(t => t !== item.type));
                  } else {
                    // Add if not selected
                    setWasteTypes([...wasteTypes, item.type]);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={wasteTypes.includes(item.type) ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={wasteTypes.includes(item.type) ? '#fff' : '#4CAF50'}
                  style={[styles.selectionIcon, wasteTypes.includes(item.type) && styles.selectionIconActive]}
                />
                <View
                  style={[
                    styles.typeIconWrapper,
                    wasteTypes.includes(item.type) && styles.typeIconWrapperActive
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={wasteTypes.includes(item.type) ? '#fff' : '#2e7d32'}
                  />
                </View>
                <Text style={[styles.buttonText, wasteTypes.includes(item.type) && styles.activeButtonText]}>
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

        {/* Bag Quantity Section */}
        <BagQuantitySelector 
          bagQuantity={bagQuantity}
          setBagQuantity={setBagQuantity}
          pricePerBag={25}
        />

        {/* Date & Time Section - Using Smart Date Picker */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Pickup Schedule</Text>
          </View>
          
          <SmartDatePicker
            selectedDate={date}
            onDateChange={setDate}
            userArea={userProfile?.barangay || address}
            bagQuantity={bagQuantity}
          />
        </View>


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
          
          {/* Simple Map Display */}
          {pickupLocation && (
            <View style={styles.mapContainer}>
              <Text style={styles.mapLabel}>📍 Pickup Location on Map</Text>
              <SpecialPickupMapSection 
                selectedLocation={pickupLocation}
                onLocationSelect={(location) => {
                  setPickupLocation(location);
                  setAddress(location.address || '');
                }}
                onMapLoaded={setMapLoaded}
              />
            </View>
          )}
          
          {/* Enhanced Location Action Buttons */}
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
                  <Ionicons name="pin" size={20} color="#fff" />
                  <Text style={styles.locationButtonText}>Pin Your Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Enhanced Map Instructions */}
          <View style={styles.mapInstructions}>
            <Ionicons name="information-circle" size={16} color="#4CAF50" />
            <Text style={styles.mapInstructionsText}>
              Tap "Pin Your Location" to auto-detect, or simply tap the map to place your pickup pin manually
            </Text>
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
  workingHoursNotice: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffc107',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  noticeText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  noticeTextBold: {
    fontWeight: '700',
    color: '#664d03',
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
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
  },
  typeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  selectionIcon: {
    marginRight: 12,
  },
  selectionIconActive: {},
  typeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIconWrapperActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  buttonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
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
  bagQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bagQuantityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
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
  // Map styles
  mapContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  mapLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e6f0ff',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapErrorText: {
    color: '#FF6B35',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
  },
  mapLoading: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 240, 255, 0.8)',
  },
  mapLoadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  // Map instructions styles
  mapInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  mapInstructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 8,
    lineHeight: 18,
  },
});

// Special Pickup Map Component
const SpecialPickupMapSection = ({ selectedLocation, onLocationSelect, onMapLoaded }) => {
  const [wvError, setWvError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
        <link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          html, body { background: #e6f0ff; }
          #map { background: #e6f0ff; position: absolute; inset: 0; }
          canvas { background: #e6f0ff !important; display: block; }
          .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { display: none; }
          
          /* My Location Button */
          .my-location-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            width: 44px;
            height: 44px;
            background: #4CAF50;
            border: none;
            border-radius: 22px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: all 0.2s ease;
          }
          
          .my-location-btn:hover {
            background: #45a049;
            transform: scale(1.05);
          }
          
          .my-location-btn:active {
            transform: scale(0.95);
          }
          
          .my-location-btn.loading {
            background: #ffa726;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        
        <script>
          let map;
          let pickupMarker;
          
          // Initialize map
          function initMap() {
            try {
              map = new maplibregl.Map({
                container: 'map',
                style: {
                  version: 8,
                  sources: {
                    'osm': {
                      type: 'raster',
                      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                      tileSize: 256,
                      attribution: '© OpenStreetMap contributors'
                    }
                  },
                  layers: [{
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                  }]
                },
                center: [125.1651827, 6.1547981], // General Santos City
                zoom: 13,
                attributionControl: false,
                scrollZoom: true,
                boxZoom: true,
                dragRotate: false,
                dragPan: true,
                keyboard: true,
                doubleClickZoom: true,
                touchZoomRotate: true
              });
              
              map.on('load', () => {
                console.log('🗺️ Special pickup map loaded');
                
                // Add zoom controls
                map.addControl(new maplibregl.NavigationControl({
                  showCompass: false,
                  showZoom: true
                }), 'top-left');
                
                // Add My Location button
                addMyLocationButton();
                
                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map_loaded' }));
              });
              
              // Handle map clicks for pin placement (keep for backward compatibility)
              map.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                setPickupLocation({ latitude: lat, longitude: lng });
                
                // Send location back to React Native
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'location_selected',
                  location: { latitude: lat, longitude: lng }
                }));
              });
              
            } catch (error) {
              console.error('Map initialization error:', error);
              window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map_error', error: error.message }));
            }
          }
          
          // Set pickup location marker
          function setPickupLocation(location) {
            if (!map || !location) return;
            
            try {
              // Remove existing marker
              if (pickupMarker) {
                pickupMarker.remove();
              }
              
              // Create pickup marker with truck icon
              const el = document.createElement('div');
              el.innerHTML = '🚛';
              el.style.fontSize = '24px';
              el.style.cursor = 'pointer';
              
              pickupMarker = new maplibregl.Marker({ element: el })
                .setLngLat([location.longitude, location.latitude])
                .addTo(map);
              
              // Center map on location
              map.flyTo({
                center: [location.longitude, location.latitude],
                zoom: 16,
                duration: 1000
              });
              
            } catch (error) {
              console.error('Error setting pickup location:', error);
            }
          }
          
          // Add My Location button
          function addMyLocationButton() {
            const button = document.createElement('button');
            button.className = 'my-location-btn';
            button.innerHTML = '📍';
            button.title = 'Go to my current location';
            
            button.addEventListener('click', getCurrentLocation);
            document.body.appendChild(button);
          }
          
          // Get user's current location
          function getCurrentLocation() {
            const button = document.querySelector('.my-location-btn');
            if (!button) return;
            
            button.classList.add('loading');
            button.innerHTML = '⏳';
            
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  
                  // Fly to user's current location
                  map.flyTo({
                    center: [longitude, latitude],
                    zoom: 16,
                    duration: 2000
                  });
                  
                  // Auto-set pin at current location
                  setTimeout(() => {
                    const location = { latitude, longitude, accuracy: position.coords.accuracy };
                    setPickupLocation(location);
                    
                    // Send current location to React Native
                    window.ReactNativeWebView?.postMessage(JSON.stringify({
                      type: 'current_location_found',
                      location: location
                    }));
                  }, 2000); // Wait for fly animation to complete
                  
                  button.classList.remove('loading');
                  button.innerHTML = '📍';
                },
                (error) => {
                  console.error('Geolocation error:', error);
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                    type: 'location_error',
                    error: 'Could not get current location'
                  }));
                  
                  button.classList.remove('loading');
                  button.innerHTML = '❌';
                  setTimeout(() => {
                    button.innerHTML = '📍';
                  }, 2000);
                },
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 60000
                }
              );
            } else {
              window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'location_error',
                error: 'Geolocation not supported'
              }));
              
              button.classList.remove('loading');
              button.innerHTML = '❌';
              setTimeout(() => {
                button.innerHTML = '📍';
              }, 2000);
            }
          }
          
          // Listen for messages from React Native
          window.addEventListener('message', (event) => {
            try {
              const data = JSON.parse(event.data);
              
              switch (data.type) {
                case 'set_pickup_location':
                  if (data.location) {
                    setPickupLocation(data.location);
                  }
                  break;
              }
            } catch (error) {
              console.error('Message handling error:', error);
            }
          });
          
          // Initialize when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
          } else {
            initMap();
          }
        </script>
      </body>
    </html>
  `, []);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'map_loaded':
          setLoaded(true);
          onMapLoaded?.(true);
          break;
        case 'location_selected':
          if (data.location && onLocationSelect) {
            onLocationSelect(data.location);
          }
          break;
        case 'map_error':
          setWvError(data.error);
          break;
      }
    } catch (error) {
      console.error('Map message parsing error:', error);
    }
  }, [onLocationSelect, onMapLoaded]);

  // Send location to map when it becomes available
  useEffect(() => {
    if (loaded && selectedLocation) {
      const message = JSON.stringify({
        type: 'set_pickup_location',
        location: selectedLocation
      });
      
      // Send message to WebView
      if (mapRef?.current) {
        mapRef.current.postMessage(message);
      }
    }
  }, [loaded, selectedLocation]);

  const onError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('Special Pickup Map WebView error:', nativeEvent);
    setWvError(nativeEvent?.description || 'Map failed to load');
  }, []);

  const mapRef = React.useRef(null);

  return (
    <View style={styles.mapWrapper}>
      {wvError ? (
        <View style={styles.mapError}>
          <Ionicons name="warning" size={32} color="#FF6B35" />
          <Text style={styles.mapErrorText}>Map Error: {wvError}</Text>
        </View>
      ) : (
        <WebView
          ref={mapRef}
          source={{ html }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          onShouldStartLoadWithRequest={() => true}
          onMessage={onMessage}
          onError={onError}
          onLoadEnd={() => console.log('🗺️ Special pickup map WebView loaded')}
        />
      )}
      
      {!loaded && !wvError && (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.mapLoadingText}>Loading Map...</Text>
        </View>
      )}
    </View>
  );
};

export default SPickup;
