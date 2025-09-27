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
      {/* Status bar */}
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* HEADER */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/resident/HomePage')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Special Pickup</Text>

        <TouchableOpacity style={styles.rightIcon}>
          <Ionicons name="information-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Type of Waste</Text>
        <View style={styles.buttonGroup}>
          {['Bulky', 'Electronics', 'Hazardous', 'Other'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, wasteType === type && styles.activeButton]}
              onPress={() => setWasteType(type)}
            >
              <Text style={styles.buttonText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          placeholder="e.g., Old sofa"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#666" />
          <Text style={styles.dateTimeText}>
            {date ? date.toDateString() : 'Select Date'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.dateTimeText}>
            {time ? time.toTimeString().split(' ')[0].substring(0, 5) : 'Select Time'}
          </Text>
        </TouchableOpacity>

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

        <TextInput
          placeholder="Enter pickup address"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
        />

        <TextInput
          placeholder="Any special instructions?"
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { height: 80 }]}
          multiline
        />

        {/* Image Picker Section */}
        <Text style={styles.label}>Attach an Image</Text>
        <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
          <Text style={styles.imagePickerButtonText}>
            {image ? 'Change Image' : 'Upload Image'}
          </Text>
        </TouchableOpacity>

        {image && (
          <Image source={{ uri: image }} style={styles.previewImage} />
        )}

        <Text style={styles.label}>Message Collector</Text>
        <View style={styles.messageBox}>
          <Text>Collector: I&apos;ll be there in 30 minutes</Text>
        </View>

        <TextInput
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          style={styles.input}
        />

        <Text style={styles.price}>Est. Price: ₱170.00 (may vary)</Text>

        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Request Pickup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10 + 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightIcon: {
    position: 'absolute',
    right: 15,
    zIndex: 10,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  typeButton: {
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 5,
    margin: 5,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginTop: 10,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  dateTimeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  imagePickerButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 5,
  },
  messageBox: {
    backgroundColor: '#eee',
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  price: {
    marginVertical: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPickup;
