import React, { useState, useEffect, useCallback } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// Change this to your computer's IP address
const BACKEND_URL = 'http://localhost:5000';  // Using localhost for web app

// Helper for cross-platform alert
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
    // If it's a success, redirect to login
    if (title.includes('Success')) {
      router.push('/RLogin');
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    username: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
    city: 'General Santos City',
    barangay: '',
    street: ''
  });

  const [open, setOpen] = useState(false);
  const [barangayItems, setBarangayItems] = useState([
    { label: 'Apopong', value: 'Apopong' },
    { label: 'Baluan', value: 'Baluan' },
    { label: 'Batomelong', value: 'Batomelong' },
    { label: 'Buayan', value: 'Buayan' },
    { label: 'Calumpang', value: 'Calumpang' },
    { label: 'City Heights', value: 'City Heights' },
    { label: 'Conel', value: 'Conel' },
    { label: 'Dadiangas East', value: 'Dadiangas East' },
    { label: 'Dadiangas North', value: 'Dadiangas North' },
    { label: 'Dadiangas South', value: 'Dadiangas South' },
    { label: 'Dadiangas West', value: 'Dadiangas West' },
    { label: 'Fatima', value: 'Fatima' },
    { label: 'Katangawan', value: 'Katangawan' },
    { label: 'Labangal', value: 'Labangal' },
    { label: 'Lagao', value: 'Lagao' },
    { label: 'Ligaya', value: 'Ligaya' },
    { label: 'Mabuhay', value: 'Mabuhay' },
    { label: 'San Isidro', value: 'San Isidro' },
    { label: 'San Jose', value: 'San Jose' },
    { label: 'Siguel', value: 'Siguel' },
    { label: 'Sinawal', value: 'Sinawal' },
    { label: 'Tambler', value: 'Tambler' },
    { label: 'Tinagacan', value: 'Tinagacan' },
    { label: 'Upper Labay', value: 'Upper Labay' }
  ]);

  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const router = useRouter();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 4,
        useNativeDriver: true
      })
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.firstName || !/^[A-Za-z\s]{2,}$/.test(formData.firstName.trim())) {
      showAlert('Error', 'First name must contain only letters and be at least 2 characters long');
      return false;
    }
    if (formData.middleName && !/^[A-Za-z\s]{1,}$/.test(formData.middleName.trim())) {
      showAlert('Error', 'Middle name must contain only letters');
      return false;
    }
    if (!formData.lastName || !/^[A-Za-z\s]{2,}$/.test(formData.lastName.trim())) {
      showAlert('Error', 'Last name must contain only letters and be at least 2 characters long');
      return false;
    }
    if (!formData.username || formData.username.trim().length < 4) {
      showAlert('Error', 'Username must be at least 4 characters long');
      return false;
    }
    if (!formData.contactNumber || !/^\+?[\d\s-]{10,}$/.test(formData.contactNumber.trim())) {
      showAlert('Error', 'Please enter a valid contact number (at least 10 digits)');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return false;
    }
    if (!formData.street) {
      showAlert('Error', 'Please enter your street address');
      return false;
    }
    if (!formData.barangay) {
      showAlert('Error', 'Please select your barangay');
      return false;
    }
    return true;
  }, [formData]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;
  
    setLoading(true);
  
    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        contactNumber: formData.contactNumber.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        city: formData.city,
        barangay: formData.barangay,
        street: formData.street.trim(),
      };
  
      console.log('🚀 Attempting to register with data:', registrationData);
      console.log('📍 Sending request to:', `${BACKEND_URL}/api/auth/register`);
  
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });
  
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📦 Response data:', data);
  
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
  
      console.log('✅ Registration successful!');
      setRegistrationSuccess(true);
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
      });
  
      showAlert(
        'Registration Failed',
        error.message || 'Unable to create your account. Please try again.',
        [{ text: 'OK' }],
        { cancelable: false }
      );
    } finally {
      setLoading(false);
    }
  }, [formData, router, validateForm]);
  

  if (registrationSuccess) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 }}>
        <Text style={{ fontSize: 24, color: 'green', marginBottom: 20 }}>🎉 Registration Successful!</Text>
        <Text style={{ fontSize: 16, marginBottom: 30 }}>Your account has been created. You can now log in.</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#2e7d32', padding: 12, borderRadius: 8 }}
          onPress={() => router.push('/RLogin')}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.formContainer, 
            { 
              opacity: fadeAnim, 
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join our community today!</Text>

          {/* Name Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(value) => handleChange('firstName', value)}
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Middle Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your middle name (optional)"
              value={formData.middleName}
              onChangeText={(value) => handleChange('middleName', value)}
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(value) => handleChange('lastName', value)}
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              value={formData.username}
              onChangeText={(value) => handleChange('username', value)}
              placeholderTextColor="#888"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 11-digit number"
              value={formData.contactNumber}
              onChangeText={(value) => handleChange('contactNumber', value)}
              keyboardType="phone-pad"
              maxLength={11}
              placeholderTextColor="#888"
            />
          </View>

          {/* Address Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123 Purok Maligaya"
              value={formData.street}
              onChangeText={(value) => handleChange('street', value)}
              placeholderTextColor="#888"
            />
          </View>

          <View style={[styles.inputContainer, { zIndex: 1000 }]}>
            <Text style={styles.label}>Barangay *</Text>
            <DropDownPicker
              open={open}
              setOpen={setOpen}
              value={formData.barangay}
              setValue={(callback) =>
                setFormData((prev) => ({ ...prev, barangay: callback(prev.barangay) }))
              }
              items={barangayItems}
              setItems={setBarangayItems}
              placeholder="Select Barangay"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              listItemLabelStyle={styles.dropdownItem}
              selectedItemLabelStyle={styles.dropdownSelectedItem}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value="General Santos City"
              editable={false}
            />
          </View>

          {/* Password Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.showHideButton}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={24} color="#3498db" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleChange('confirmPassword', value)}
              placeholderTextColor="#888"
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View  style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/RLogin')}>
              <Text style={styles.loginLink}>Login here</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  dropdown: {
    backgroundColor: '#f8f8f8',
    borderColor: '#ddd',
    borderRadius: 8,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownPlaceholder: {
    color: '#888',
  },
  dropdownItem: {
    color: '#333',
  },
  dropdownSelectedItem: {
    color: '#007AFF',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  showHideButton: {
    padding: 8,
  },
});

export default RegisterScreen;
