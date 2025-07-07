import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const SPickup = () => {
  const router = useRouter();
  const [wasteType, setWasteType] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);

  const handleSubmit = () => {
    console.log({ wasteType, description, date, time, address, notes, message, image });
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

        <TextInput
          placeholder="Date (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          style={styles.input}
        />

        <TextInput
          placeholder="Time (HH:MM)"
          value={time}
          onChangeText={setTime}
          style={styles.input}
        />

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

        <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Request Pickup</Text>
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
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SPickup;
