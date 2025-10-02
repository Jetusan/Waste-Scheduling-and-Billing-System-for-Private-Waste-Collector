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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { getToken, getUserId } from './auth';
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

  // Get current user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userId = await getUserId();
        const token = await getToken();
        
        if (userId) {
          setCurrentUserId(userId);
        }

        // Get user profile for address prefill
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setUserProfile(data.user);
              // Pre-fill address if available
              if (data.user.full_address) {
                setAddress(data.user.full_address);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  const handleSubmit = async () => {
    // Basic validation
    if (!wasteType || !description || !date || !time || !address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
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
                // Clear the form
                setWasteType('');
                setDescription('');
                setDate('');
                setTime('');
                setAddress('');
                setNotes('');
                setMessage('');
                setImage(null);
                // Navigate back to home page where they can see their requests
                router.push('/resident/HomePage');
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
            <Text style={styles.headerTitle}>Special Pickup Request</Text>
            <Text style={styles.headerSubtitle}>Schedule a custom waste collection</Text>
          </View>

          <TouchableOpacity style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Pickup Address</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Enter your complete address"
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              multiline
            />
          </View>
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
  infoButton: {
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
});

export default SPickup;
