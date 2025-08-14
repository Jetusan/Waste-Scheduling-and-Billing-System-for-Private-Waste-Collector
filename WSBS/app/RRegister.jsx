import React, { useState, useEffect, useCallback } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated, FlatList, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from './config';

// Helper for cross-platform alert
const showAlert = (title, message, buttons, router) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
    // If it's a success, redirect to login
    if (title.includes('Success')) {
      router.push('/RLogin');
    }
  } else {
    Alert.alert(title, message, buttons);
    // Also redirect on mobile for success cases
    if (title.includes('Success')) {
      // Add a slight delay before redirecting to allow user to read success message
      setTimeout(() => {
        router.push('/RLogin');
      }, 2000);
    }
  }
};

const RegisterScreen = () => {
  const [currentStep, setCurrentStep] = useState(1);
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
    street: '',
    houseNumber: '',
    purok: '',
    email: ''
  });
  
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4 scale

  const [open, setOpen] = useState(false);
  const [barangayValue, setBarangayValue] = useState(null);
  const [barangayItems, setBarangayItems] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(true);
  
  // Fetch barangays from backend
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/barangays`);
        if (response.ok) {
          const barangays = await response.json();
          const formattedBarangays = barangays.map(barangay => ({
            label: barangay.barangay_name,
            value: barangay.barangay_name
          }));
          setBarangayItems(formattedBarangays);
        } else {
          console.error('Failed to fetch barangays');
        }
      } catch (error) {
        console.error('Error fetching barangays:', error);
      } finally {
        setBarangayLoading(false);
      }
    };
    
    fetchBarangays();
  }, []);

  // Sync barangayValue with formData
  useEffect(() => {
    setBarangayValue(formData.barangay || null);
  }, [formData.barangay]);

  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const router = useRouter();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

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
    
    // Calculate password strength when password changes
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^A-Za-z0-9]/.test(value)) strength++;
      setPasswordStrength(strength);
    }
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.firstName || !/^[A-Za-z\s]{2,}$/.test(formData.firstName.trim())) {
      showAlert('Error', 'First name must contain only letters and be at least 2 characters long', [{ text: 'OK' }], router);
      return false;
    }
    if (formData.middleName && !/^[A-Za-z\s]{1,}$/.test(formData.middleName.trim())) {
      showAlert('Error', 'Middle name must contain only letters', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.lastName || !/^[A-Za-z\s]{2,}$/.test(formData.lastName.trim())) {
      showAlert('Error', 'Last name must contain only letters and be at least 2 characters long', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.username || formData.username.trim().length < 4) {
      showAlert('Error', 'Username must be at least 4 characters long', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.contactNumber || !/^((09|\+639)\d{9})|(\d{10,12})$/.test(formData.contactNumber.trim())) {
      showAlert('Error', 'Please enter a valid Philippine contact number (e.g., 09123456789 or +639123456789)', [{ text: 'OK' }], router);
      return false;
    }
    // Enhanced password validation
    if (!formData.password) {
      showAlert('Error', 'Password is required', [{ text: 'OK' }], router);
      return false;
    }
    
    if (formData.password.length < 8) {
      showAlert('Error', 'Password must be at least 8 characters long', [{ text: 'OK' }], router);
      return false;
    }
    
    // Check password strength
    if (passwordStrength < 2) {
      showAlert('Error', 'Password is too weak. Please use a stronger password with a mix of letters, numbers, and symbols.', [{ text: 'OK' }], router);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showAlert('Error', 'Passwords do not match', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.street) {
      showAlert('Error', 'Please enter your street address', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.barangay) {
      showAlert('Error', 'Please select your barangay', [{ text: 'OK' }], router);
      return false;
    }
    return true;
  }, [formData, router]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;
  
    setLoading(true);
  
    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || null,
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        contactNumber: formData.contactNumber.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        city: formData.city,
        barangay: formData.barangay,
        street: formData.street.trim(),
        houseNumber: formData.houseNumber.trim() || null,
        purok: formData.purok.trim() || null,
        email: formData.email.trim() || null
      };

      // Use optimized registration endpoint for cleaned database
      const response = await fetch(`${API_BASE_URL}/api/auth/register-optimized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Reset form first
        setFormData({
          firstName: '',
          middleName: '',
          lastName: '',
          username: '',
          contactNumber: '',
          password: '',
          confirmPassword: '',
          city: 'General Santos City',
          barangay: '',
          street: '',
          houseNumber: '',
          purok: '',

          email: ''
        });
        
        // Show success message with user details
        const successMessage = `Welcome ${result.user.name}!\n\n📍 Address: ${result.user.address}\n📱 Phone: ${result.user.phone}\n\nRedirecting to login...`;
        showAlert('Registration Success! 🎉', successMessage, [{ text: 'Continue to Login' }], router);
      } else {
        // Handle specific error cases
        if (result.message) {
          showAlert('Registration Failed', result.message, [{ text: 'Try Again' }], router);
        } else if (result.errors && result.errors.length > 0) {
          showAlert('Validation Errors', result.errors.join('\n'), [{ text: 'OK' }], router);
        } else {
          showAlert('Error', 'Registration failed. Please try again.', [{ text: 'OK' }], router);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Network Error', 'Unable to connect to server. Please check your connection and try again.', [{ text: 'OK' }], router);
    } finally {
      setLoading(false);
    }
  }, [formData, router, validateForm]);

  const validateStep1 = () => {
    const errors = [];
    if (!formData.firstName || !/^[A-Za-z\s]{2,}$/.test(formData.firstName.trim())) {
      errors.push('First name must contain only letters and be at least 2 characters long');
    }
    if (formData.middleName && !/^[A-Za-z\s]{1,}$/.test(formData.middleName.trim())) {
      errors.push('Middle name must contain only letters');
    }
    if (!formData.lastName || !/^[A-Za-z\s]{2,}$/.test(formData.lastName.trim())) {
      errors.push('Last name must contain only letters and be at least 2 characters long');
    }
    if (!formData.username || formData.username.trim().length < 4) {
      errors.push('Username must be at least 4 characters long');
    }
    if (!formData.contactNumber || !/^((09|\+639)\d{9})|(\d{10,12})$/.test(formData.contactNumber.trim())) {
      errors.push('Please enter a valid Philippine contact number');
    }
    return errors;
  };

  const validateStep2 = () => {
    const errors = [];
    if (!formData.street) {
      errors.push('Please enter your street address');
    }
    if (!formData.barangay) {
      errors.push('Please select your barangay');
    }
    return errors;
  };

  const validateStep3 = () => {
    const errors = [];
    if (!formData.password) {
      errors.push('Password is required');
    }
    if (formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (passwordStrength < 2) {
      errors.push('Password is too weak. Use a mix of letters, numbers, and symbols.');
    }
    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }
    return errors;
  };

  const handleNextStep = () => {
    let errors = [];
    
    if (currentStep === 1) {
      errors = validateStep1();
    } else if (currentStep === 2) {
      errors = validateStep2();
    }

    if (errors.length > 0) {
      showAlert('Validation Error', errors.join('\n'), [{ text: 'OK' }], router);
      return;
    }

    if (currentStep < 3) {
      nextStep();
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Step 1: Personal Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

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
          placeholder="e.g., 09123456789"
          value={formData.contactNumber}
          onChangeText={(value) => handleChange('contactNumber', value)}
          keyboardType="phone-pad"
          maxLength={13}
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="your.email@example.com"
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Step 2: Address Information</Text>
      <Text style={styles.stepSubtitle}>Where are you located?</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>House Number (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 123, Block 5, Lot 10"
          value={formData.houseNumber}
          onChangeText={(value) => handleChange('houseNumber', value)}
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Maharlika Street"
          value={formData.street}
          onChangeText={(value) => handleChange('street', value)}
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Purok/Subdivision (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Purok Maligaya"
          value={formData.purok}
          onChangeText={(value) => handleChange('purok', value)}
          placeholderTextColor="#888"
        />
      </View>

      <View style={[styles.inputContainer, { zIndex: 1000 }]}>
        <Text style={styles.label}>Barangay *</Text>
        {barangayLoading ? (
          <Text style={styles.dropdownPlaceholder}>Loading barangays...</Text>
        ) : (
          <DropDownPicker
            open={open}
            value={barangayValue}
            items={barangayItems}
            setOpen={setOpen}
            setValue={setBarangayValue}
            setItems={setBarangayItems}
            placeholder="Select your Barangay"
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            dropDownContainerStyle={styles.dropdownContainer}
            listMode="MODAL"
            searchable={true}
            zIndex={3000}
            zIndexInverse={1000}
            onSelectItem={(item) => {
              handleChange('barangay', item.value);
            }}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value="General Santos City"
          editable={false}
        />
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Step 3: Account Security</Text>
      <Text style={styles.stepSubtitle}>Create a secure password</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            secureTextEntry={!showPassword}
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showHideButton}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.showHideButton}>
            <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Strength Indicator */}
      <View style={styles.passwordStrengthContainer}>
        <Text style={styles.label}>Password Strength:</Text>
        <View style={styles.passwordStrengthBar}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View 
              key={index}
              style={[
                styles.passwordStrengthSegment,
                index <= passwordStrength ? 
                  (passwordStrength < 2 ? styles.passwordStrengthWeak : 
                   passwordStrength < 4 ? styles.passwordStrengthMedium : 
                   styles.passwordStrengthStrong) : 
                  styles.passwordStrengthEmpty
              ]} 
            />
          ))}
        </View>
        <Text style={styles.passwordStrengthText}>
          {passwordStrength === 0 ? 'Very Weak' : 
           passwordStrength === 1 ? 'Weak' : 
           passwordStrength === 2 ? 'Fair' : 
           passwordStrength === 3 ? 'Good' : 
           passwordStrength === 4 ? 'Strong' : 
           passwordStrength === 5 ? 'Very Strong' : ''}
        </Text>
      </View>
    </>
  );



  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
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
          
          {/* Step Indicator */}
          <View style={styles.stepIndicatorContainer}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.stepIndicatorRow}>
                <View style={[
                  styles.stepIndicator, 
                  i === currentStep ? styles.stepIndicatorActive : 
                  i < currentStep ? styles.stepIndicatorCompleted : {}
                ]}>
                  {i < currentStep ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <Text style={[
                      styles.stepIndicatorText,
                      i === currentStep ? styles.stepIndicatorTextActive : {}
                    ]}>{i}</Text>
                  )}
                </View>
                {i < 3 && <View style={[
                  styles.stepIndicatorLine,
                  i < currentStep ? styles.stepIndicatorLineCompleted : {}
                ]} />}
              </View>
            ))}
          </View>

          {/* Render Current Step */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={prevStep}
              >
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < 3 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={handleNextStep}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Register</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

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
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
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
  passwordStrengthContainer: {
    marginBottom: 16,
  },
  passwordStrengthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passwordStrengthSegment: {
    height: 8,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 2,
  },
  passwordStrengthEmpty: {
    backgroundColor: '#e0e0e0',
  },
  passwordStrengthWeak: {
    backgroundColor: '#ff4444',
  },
  passwordStrengthMedium: {
    backgroundColor: '#ffaa00',
  },
  passwordStrengthStrong: {
    backgroundColor: '#00c851',
  },
  passwordStrengthText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
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
  // Step-based styles
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#3498db',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#2ecc71',
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  stepIndicatorTextActive: {
    color: '#fff',
  },
  stepIndicatorLine: {
    width: 30,
    height: 2,
    backgroundColor: '#ddd',
  },
  stepIndicatorLineCompleted: {
    backgroundColor: '#2ecc71',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  prevButton: {
    backgroundColor: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  nextButton: {
    backgroundColor: '#3498db',
  },
  prevButtonText: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default RegisterScreen;
