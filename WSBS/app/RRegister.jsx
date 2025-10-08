import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated, ScrollView, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from './config';
import * as ImagePicker from 'expo-image-picker';

// Helper for cross-platform alert
const showAlert = (title, message, buttons, router, shouldRedirect = false) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
    // Only redirect if explicitly requested (for registration completion)
    if (shouldRedirect && title.includes('Registration Success')) {
      router.push('/RLogin');
    }
  } else {
    Alert.alert(title, message, buttons);
    // Only redirect on mobile for registration completion
    if (shouldRedirect && title.includes('Registration Success')) {
      // Add a slight delay before redirecting to allow user to read success message
      setTimeout(() => {
        router.push('/RLogin');
      }, 2000);
    }
  }
};

const RegisterScreen = () => {
  const [currentStep, setCurrentStep] = useState(1);

  // Request media library permissions for expo-image-picker
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera roll permissions are needed to upload proof.');
      }
    })();
  }, []);
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
  subdivision: '', // Add this
  street: '',
  block: '', // Add this
  lot: '', // Add this
  houseNumber: '',
  purok: '',
  email: '',
  dateOfBirth: '',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  validationImage: null
});
  
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4 scale

  const [open, setOpen] = useState(false);
  const [barangayValue, setBarangayValue] = useState(null);
  const [barangayItems, setBarangayItems] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(true);
  // Subdivision dropdown state
  const [subdivisionOpen, setSubdivisionOpen] = useState(false);
  const [subdivisionValue, setSubdivisionValue] = useState(null);
  const [subdivisionItems, setSubdivisionItems] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Subdivision directory mapping
  const subdivisionDirectory = {
    "City Heights": [
      "L. Dacera Subdivision", "T. Dacera Subdivision", "Dadiangas Heights Subdivision", "Daricom Subdivision", "De Castro Subdivision", "Del Carmen Subdivision", "Dela Cuadra Subdivision", "Divina Lim Subdivision", "Elma Subdivision", "Ferraren Subdivision", "Hermosa Subdivision", "Las Villas de Dadiangas", "Leyva Subdivision", "Lim Subdivision", "Lualhati Village", "Marin Village", "Morales Subdivision", "Munda Subdivision", "Paradise / Paralejas Subdivision", "Paparon Subdivision", "Provido Subdivision", "Pineda Subdivision", "Queenie’s Love Village", "Rogan Subdivision", "Royeca Subdivision", "Salvani Subdivision", "Santa Teresita Village"
    ],
    "Lagao": [
      "Anas Subdivision", "Ascue Subdivision", "Artates Subdivision", "Balite Subdivision", "Bugarin Subdivision", "Carcon Subdivision", "Country Homes Subdivision", "Countryside Subdivision", "Cyrilang Subdivision", "DBP Subdivision", "Diaz Subdivision", "Falgui Subdivision", "Guinoo Subdivision", "Hicban Subdivision", "Lagman Subdivision", "Mateo Subdivision", "Pag-Asa Subdivision", "Paulino Llido Subdivision", "Leon Llido Subdivision", "Pioneer Village", "Rosario Village", "Camella Cerritos GenSan", "Lessandra General Santos"
    ],
    "San Isidro": [
      "Anas Subdivision", "Ascue Subdivision", "Artates Subdivision", "Balite Subdivision", "Bugarin Subdivision", "Carcon Subdivision", "Country Homes Subdivision", "Countryside Subdivision", "Cyrilang Subdivision", "DBP Subdivision", "Diaz Subdivision", "Falgui Subdivision", "Guinoo Subdivision", "Hicban Subdivision", "Lagman Subdivision", "Mateo Subdivision", "Pag-Asa Subdivision", "Paulino Llido Subdivision", "Leon Llido Subdivision", "Pioneer Village", "Rosario Village", "Camella Cerritos GenSan", "Lessandra General Santos"
    ],
    "Katangawan": ["Camella Trails"],
    "Fatima": ["Natad Subdivision", "Pioneer Village Ext.", "VSM Estate / Meadows / Premier Estates"],
    "Calumpang": ["Santa Monica Subdivision", "Superville Subdivision"],
    "Buayan": ["Santiago Subdivision", "Shrineville Subdivision"],
    "Apopong": ["Rosewood Subdivision", "Yanson Village", "Loveland Subdivision"]
  };
  
  // Date picker configuration

  // Add new state variables for the address fields
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockValue, setBlockValue] = useState(null);
  const [blockItems, setBlockItems] = useState([
    { label: 'Block 1', value: 'Block 1' },
    { label: 'Block 2', value: 'Block 2' },
    { label: 'Block 3', value: 'Block 3' },
    { label: 'Block 4', value: 'Block 4' },
    { label: 'Block 5', value: 'Block 5' },
    { label: 'Block 6', value: 'Block 6' },
    { label: 'Block 7', value: 'Block 7' },
    { label: 'Block 8', value: 'Block 8' },
    { label: 'Block 9', value: 'Block 9' },
    { label: 'Block 10', value: 'Block 10' },
  ]);

  const [lotOpen, setLotOpen] = useState(false);
  const [lotValue, setLotValue] = useState(null);
  const [lotItems, setLotItems] = useState([
    { label: 'Lot 1', value: 'Lot 1' },
    { label: 'Lot 2', value: 'Lot 2' },
    { label: 'Lot 3', value: 'Lot 3' },
    { label: 'Lot 4', value: 'Lot 4' },
    { label: 'Lot 5', value: 'Lot 5' },
    { label: 'Lot 6', value: 'Lot 6' },
    { label: 'Lot 7', value: 'Lot 7' },
    { label: 'Lot 8', value: 'Lot 8' },
    { label: 'Lot 9', value: 'Lot 9' },
    { label: 'Lot 10', value: 'Lot 10' },
  ]);
  
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const minDate = useMemo(() => new Date(1950, 0, 1), []);
  const maxDate = useMemo(() => new Date(maxYear, 11, 31), [maxYear]);
  
  const selectedDate = useMemo(() => {
    if (!formData.dateOfBirth) return null;
    const parts = formData.dateOfBirth.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }, [formData.dateOfBirth]);

  const formattedDob = useMemo(() => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDate]);

  // Animation functions for date picker modal
  const openDatePicker = useCallback(() => {
    setShowDatePicker(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [modalAnimation]);

  const closeDatePicker = useCallback(() => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowDatePicker(false);
    });
  }, [modalAnimation]);
  
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

  // Sync subdivisionValue with formData
  useEffect(() => {
    setSubdivisionValue(formData.subdivision || null);
  }, [formData.subdivision]);

  // Update subdivision dropdown when barangay changes
  useEffect(() => {
    if (formData.barangay && subdivisionDirectory[formData.barangay]) {
      setSubdivisionItems(
        subdivisionDirectory[formData.barangay].map(sub => ({ label: sub, value: sub }))
      );
    } else {
      setSubdivisionItems([]);
    }
    setSubdivisionValue(null);
    setFormData(prev => ({ ...prev, subdivision: '' }));
  }, [formData.barangay]);

  // Sync blockValue with formData
  useEffect(() => {
    setBlockValue(formData.block || null);
  }, [formData.block]);

  // Sync lotValue with formData
  useEffect(() => {
    setLotValue(formData.lot || null);
  }, [formData.lot]);

  // Add this useEffect to handle zIndex issues
  useEffect(() => {
    if (open) {
      setBlockOpen(false);
      setLotOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (blockOpen) {
      setOpen(false);
      setLotOpen(false);
    }
  }, [blockOpen]);

  useEffect(() => {
    if (lotOpen) {
      setOpen(false);
      setBlockOpen(false);
    }
  }, [lotOpen]);

  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const router = useRouter();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const pickImage = async () => {
    console.log('Upload Proof button pressed');
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    console.log('ImagePicker result:', result);
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleChange('validationImage', result.assets[0].uri);
    }
  };

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
    
    // Reset email verification when email changes
    if (name === 'email') {
      setEmailVerified(false);
      setEmailVerificationSent(false);
    }
    
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

  // Email verification function
  const handleEmailVerification = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showAlert('Error', 'Please enter a valid email address first', [{ text: 'OK' }], router);
      return;
    }

    setVerificationLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.trim(),
          name: `${formData.firstName} ${formData.lastName}`.trim() || 'User'
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setEmailVerificationSent(true);
        showAlert('Verification Sent', 'Please check your email and click the verification link to continue.', [{ text: 'OK' }], router);
      } else {
        showAlert('Error', result.message || 'Failed to send verification email', [{ text: 'OK' }], router);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      showAlert('Error', 'Unable to send verification email. Please check your connection.', [{ text: 'OK' }], router);
    } finally {
      setVerificationLoading(false);
    }
  };

  // Check verification status
  const checkVerificationStatus = async () => {
    if (!formData.email) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-verification-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const result = await response.json();
      if (result.verified) {
        setEmailVerified(true);
        showAlert('Email Verified', 'Email verified successfully! You can now continue with registration.', [{ text: 'OK' }], router);
      }
    } catch (error) {
      console.error('Verification check error:', error);
    }
  };

  // Handle phone number formatting
  const handlePhoneChange = useCallback((value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    let formattedValue = '';
    // If user enters 11 digits starting with 09, convert to +639xxxxxxxxx
    if (digits.length === 11 && digits.startsWith('09')) {
      formattedValue = '+63' + digits.substring(1);
    } else if (digits.length === 12 && digits.startsWith('639')) {
      formattedValue = '+' + digits;
    } else if (digits.length === 9) {
      // If user enters only 9 digits, assume +639xxxxxxxxx
      formattedValue = '+639' + digits;
    } else if (digits.length === 13 && digits.startsWith('639')) {
      // Edge case: user enters +639xxxxxxxxx with +
      formattedValue = '+' + digits;
    } else {
      // Otherwise, just set what they typed (for validation to catch)
      formattedValue = value;
    }
    setFormData(prev => ({ ...prev, contactNumber: formattedValue }));
  }, []);

  // Handle date selection from DateTimePicker
  const handleDateSelected = useCallback((event, date) => {
    // Don't close modal automatically - let user tap Done/Cancel
    if (event.type === 'dismissed' || !date) {
      return;
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    setFormData(prev => ({
      ...prev,
      birthYear: String(y),
      birthMonth: m,
      birthDay: d,
      dateOfBirth: `${y}-${m}-${d}`
    }));
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
    if (!formData.contactNumber || !/^\+639\d{9}$/.test(formData.contactNumber.trim())) {
      showAlert('Error', 'Please enter a valid Philippine mobile number (+639xxxxxxxxx)', [{ text: 'OK' }], router);
      return false;
    }
    // Email validation
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showAlert('Error', 'Please enter a valid email address', [{ text: 'OK' }], router);
      return false;
    }
    
    // Email verification validation
    if (!emailVerified) {
      showAlert('Error', 'Please verify your email address before continuing with registration', [{ text: 'OK' }], router);
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
    if (!formData.barangay) {
      showAlert('Error', 'Please select your barangay', [{ text: 'OK' }], router);
      return false;
    }
    // Final Step-2 required checks to prevent backend rejection
    if (!formData.subdivision) {
      showAlert('Error', 'Please select your subdivision', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.block) {
      showAlert('Error', 'Please select your block', [{ text: 'OK' }], router);
      return false;
    }
    if (!formData.lot) {
      showAlert('Error', 'Please select your lot', [{ text: 'OK' }], router);
      return false;
    }
    return true;
  }, [formData, router]);

  const handleRegister = useCallback(async () => {
    if (!formData.validationImage) {
        showAlert('Validation Required', 'Please attach a proof of residency to continue.');
        return;
    }
    if (!validateForm()) return;
  
    setLoading(true);
  
    try {
      const body = new FormData();

      const uriParts = formData.validationImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      body.append('proofImage', {
        uri: formData.validationImage,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });

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
        subdivision: formData.subdivision.trim(), // Add this
        street: formData.street.trim(),
        block: formData.block, // Add this
        lot: formData.lot, // Add this
        houseNumber: formData.houseNumber.trim() || null,
        purok: formData.purok.trim() || null,
        email: formData.email.trim(),
        dateOfBirth: formData.dateOfBirth
      };

      for (const key in registrationData) {
        if (registrationData[key] !== null && registrationData[key] !== undefined) {
          body.append(key, String(registrationData[key]));
        }
      }

      // Use optimized registration endpoint for cleaned database
      // Debug: log the sanitized data being sent (excluding image binary)
      console.log('Submitting registration payload:', {
        firstName: registrationData.firstName,
        middleName: registrationData.middleName,
        lastName: registrationData.lastName,
        username: registrationData.username,
        contactNumber: registrationData.contactNumber,
        city: registrationData.city,
        barangay: registrationData.barangay,
        subdivision: registrationData.subdivision,
        street: registrationData.street,
        block: registrationData.block,
        lot: registrationData.lot,
        houseNumber: registrationData.houseNumber,
        purok: registrationData.purok,
        email: registrationData.email,
        dateOfBirth: registrationData.dateOfBirth ? '[PROVIDED]' : '[MISSING]'
      });

      const response = await fetch(`${API_BASE_URL}/api/auth/register-optimized`, {
        method: 'POST',
        body: body,
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.warn('Non-JSON response from server:', e);
        result = { success: false, message: 'Server returned an unexpected response.' };
      }

      console.log('Registration response status:', response.status);
      console.log('Registration response body:', result);

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
          subdivision: '', // Add this
          street: '',
          block: '', // Add this
          lot: '', // Add this
          houseNumber: '',
          purok: '',
          email: '',
          dateOfBirth: '',
          birthMonth: '',
          birthDay: '',
          birthYear: ''
        });
        
        // Show success message with user details
        const successMessage = `Welcome ${result.user.name}!\n\n📍 Address: ${result.user.address}\n📱 Phone: ${result.user.phone}\n\nRedirecting to login...`;
        showAlert('Registration Success! 🎉', successMessage, [{ text: 'Continue to Login' }], router, true);
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
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.push('Please enter a valid email address');
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
    if (!formData.contactNumber || !/^((09|\+639)\d{9})|(\d{10})$/.test(formData.contactNumber.trim())) {
      errors.push('Please enter a valid Philippine contact number');
    }
    
    // Date of birth validation
    if (!formData.dateOfBirth) {
      errors.push('Date of birth is required');
    } else {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      
      if (isNaN(birthDate.getTime())) {
        errors.push('Please enter a valid date of birth');
      } else {
        if (birthDate > today) {
          errors.push('Date of birth cannot be in the future');
        } else {
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();
          
          if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && dayDiff < 0)) {
            errors.push('You must be at least 18 years old to register');
          }
        }
      }
    }
    
    return errors;
  };

  const validateStep2 = () => {
  const errors = [];
  if (!formData.barangay) {
    errors.push('Please select your barangay');
  }
  if (!formData.subdivision) {
    errors.push('Please enter your subdivision');
  }
  if (!formData.block) {
    errors.push('Please select your block');
  }
  if (!formData.lot) {
    errors.push('Please select your lot');
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
      
      // Additional check for email verification before proceeding to step 2
      if (errors.length === 0 && !emailVerified) {
        showAlert('Email Verification Required', 'Please verify your email address before proceeding to the next step.', [{ text: 'OK' }], router);
        return;
      }
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

        <Text style={styles.label}>Proof of Residency *</Text>
          <Text style={styles.helperText}>Upload a valid ID or utility bill as proof</Text>
          {formData.validationImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: formData.validationImage }} style={styles.imagePreview} />
              <TouchableOpacity onPress={() => handleChange('validationImage', null)} style={styles.removeImageButton}>
                <Feather name="x-circle" size={20} color="#E53935" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Feather name="upload" size={20} color="#007BFF" />
              <Text style={styles.imagePickerButtonText}>Upload Proof</Text>
            </TouchableOpacity>
          )}
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
        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCodeContainer}>
            <Text style={styles.countryCodeText}>🇵🇭 +63</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="9123456789"
            value={formData.contactNumber.replace('+639', '')}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={11}
            placeholderTextColor="#888"
          />
        </View>
        <Text style={styles.helperText}>Philippine mobile number (will be saved as +639xxxxxxxxx)</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, !formData.email && styles.requiredField]}
          placeholder="your.email@example.com"
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#888"
        />
        
        {/* Email Verification Section */}
        <View style={styles.verificationContainer}>
          {!emailVerified && !emailVerificationSent && (
            <TouchableOpacity 
              style={styles.verifyButton} 
              onPress={handleEmailVerification}
              disabled={verificationLoading || !formData.email}
            >
              {verificationLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="mail" size={16} color="#fff" />
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {emailVerificationSent && !emailVerified && (
            <View style={styles.verificationStatus}>
              <View style={styles.statusRow}>
                <Feather name="clock" size={16} color="#FF9800" />
                <Text style={styles.statusText}>Verification email sent! Check your inbox.</Text>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.checkButton} 
                  onPress={checkVerificationStatus}
                >
                  <Feather name="refresh-cw" size={14} color="#007BFF" />
                  <Text style={styles.checkButtonText}>Check Status</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.resendButton} 
                  onPress={handleEmailVerification}
                  disabled={verificationLoading}
                >
                  {verificationLoading ? (
                    <ActivityIndicator size="small" color="#FF9800" />
                  ) : (
                    <>
                      <Feather name="mail" size={14} color="#FF9800" />
                      <Text style={styles.resendButtonText}>Resend Email</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {emailVerified && (
            <View style={styles.verifiedStatus}>
              <Feather name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.verifiedText}>Email verified successfully!</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth *</Text>
        <Text style={styles.helperText}>You must be at least 18 years old to register</Text>
        
        <TouchableOpacity
          style={styles.singleDateSelector}
          onPress={openDatePicker}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={18} color="#007BFF" style={styles.dateIcon} />
          <Text style={formattedDob ? styles.singleDateText : styles.singleDatePlaceholder}>
            {formattedDob || 'Select your birth date'}
          </Text>
          <Feather name="chevron-down" size={16} color="#888" />
        </TouchableOpacity>

        {/* Custom Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity 
            style={styles.dateModalOverlay}
            activeOpacity={1}
            onPress={closeDatePicker}
          >
            <Animated.View 
              style={[
                styles.dateModalContent,
                {
                  transform: [
                    { 
                      scale: modalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      })
                    }
                  ],
                  opacity: modalAnimation,
                }
              ]}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity onPress={closeDatePicker}>
                    <Text style={styles.dateModalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>Select Birth Date</Text>
                  <TouchableOpacity onPress={closeDatePicker}>
                    <Text style={styles.dateModalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    mode="date"
                    display="spinner"
                    value={selectedDate || maxDate}
                    onChange={handleDateSelected}
                    maximumDate={maxDate}
                    minimumDate={minDate}
                    style={styles.datePicker}
                    textColor="#333"
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    </>
  );

  const renderStep2 = () => (
  <>
    <Text style={styles.stepTitle}>Step 2: Address Information</Text>
    <Text style={styles.stepSubtitle}>Where are you located?</Text>

    {/* 1. City - Fixed */}
    <View style={styles.inputContainer}>
      <Text style={styles.label}>City</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value="General Santos City"
        editable={false}
      />
    </View>

    {/* 2. Barangay - Dropdown */}
    <View style={[styles.inputContainer, { zIndex: 4000 }]}>
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
          zIndex={4000}
          zIndexInverse={1000}
          onSelectItem={(item) => {
            handleChange('barangay', item.value);
          }}
        />
      )}
    </View>

    {/* 3. Subdivision - Required Dropdown */}
    <View style={[styles.inputContainer, { zIndex: 3500 }]}> 
      <Text style={styles.label}>Subdivision *</Text>
      <DropDownPicker
        open={subdivisionOpen}
        value={subdivisionValue}
        items={subdivisionItems}
        setOpen={setSubdivisionOpen}
        setValue={setSubdivisionValue}
        setItems={setSubdivisionItems}
        placeholder="Select your Subdivision"
        style={styles.dropdown}
        textStyle={styles.dropdownText}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="MODAL"
        searchable={true}
        zIndex={3500}
        zIndexInverse={1500}
        onSelectItem={(item) => {
          setFormData(prev => ({ ...prev, subdivision: item.value }));
        }}
      />
    </View>

    {/* 4. Street - Optional */}
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Street (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your street name"
        value={formData.street}
        onChangeText={(value) => handleChange('street', value)}
        placeholderTextColor="#888"
      />
    </View>

    {/* 5. Block - Required Dropdown */}
    <View style={[styles.inputContainer, { zIndex: 3000 }]}>
      <Text style={styles.label}>Block *</Text>
      <DropDownPicker
        open={blockOpen}
        value={blockValue}
        items={blockItems}
        setOpen={setBlockOpen}
        setValue={setBlockValue}
        setItems={setBlockItems}
        placeholder="Select your Block"
        style={styles.dropdown}
        textStyle={styles.dropdownText}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="MODAL"
        searchable={true}
        zIndex={3000}
        zIndexInverse={2000}
        onSelectItem={(item) => {
          handleChange('block', item.value);
        }}
      />
    </View>

    {/* 6. Lot - Required Dropdown */}
    <View style={[styles.inputContainer, { zIndex: 2000 }]}>
      <Text style={styles.label}>Lot *</Text>
      <DropDownPicker
        open={lotOpen}
        value={lotValue}
        items={lotItems}
        setOpen={setLotOpen}
        setValue={setLotValue}
        setItems={setLotItems}
        placeholder="Select your Lot"
        style={styles.dropdown}
        textStyle={styles.dropdownText}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="MODAL"
        searchable={true}
        zIndex={2000}
        zIndexInverse={3000}
        onSelectItem={(item) => {
          handleChange('lot', item.value);
        }}
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
    marginBottom: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
    padding: 0,
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
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  imagePickerButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60, // Reduced from 150
    borderWidth: 2,
    borderColor: '#007BFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 5, // Reduced from 20
    backgroundColor: '#F8F9FA',
  },
  imagePickerButtonText: {
    color: '#007BFF',
    marginTop: 8, // Reduced from 10
    fontSize: 10, // Reduced from 16
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 10, // Reduced from 20
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 150, // Reduced from 200
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 2,
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
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    alignSelf: 'center',
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 0,
    elevation: 2,
  },
  nextButton: {
    backgroundColor: '#3498db',
  },
  prevButtonText: {
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    padding: 0,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  countryCodeContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  singleDateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 8,
  },
  dateIcon: {
    marginRight: 12,
  },
  singleDateText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  singleDatePlaceholder: {
    fontSize: 15,
    color: '#888',
    flex: 1,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateModalCancel: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '400',
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dateModalDone: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
  datePickerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  datePicker: {
    height: 200,
    width: '100%',
  },
  // Email verification styles
  verificationContainer: {
    marginTop: 8,
  },
  verifyButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  verificationStatus: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    color: '#856404',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flex: 1,
  },
  checkButtonText: {
    color: '#007BFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3CD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  resendButtonText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  verifiedStatus: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#155724',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RegisterScreen;
