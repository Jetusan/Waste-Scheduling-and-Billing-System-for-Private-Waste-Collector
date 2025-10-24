import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from './config';
import { getToken, getUserId } from './auth';

const ManualGCashPayment = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [paymentProof, setPaymentProof] = useState(null);
  const [formData, setFormData] = useState({
    referenceNumber: '',
    gcashNumber: '',
    notes: ''
  });

  // GCash Details (from your merchant info)
  const GCASH_DETAILS = {
    number: '09916771885',
    name: 'Jytt Dela Pena',
    merchant: 'WSBS- Waste Management'
  };

  // Minimum payment amount
  const MINIMUM_PAYMENT = 199;

  const subscription = params.subscription ? JSON.parse(params.subscription) : null;
  const amount = params.amount || subscription?.price || '0';

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload payment proof.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPaymentProof(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPaymentProof(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Payment Proof',
      'Choose how you want to add your payment screenshot',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const submitPayment = async () => {
    if (!paymentProof) {
      Alert.alert('Missing Information', 'Please upload your payment proof screenshot');
      return;
    }

    if (!formData.gcashNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your GCash number');
      return;
    }

    // Validate minimum payment amount
    const paymentAmount = parseFloat(amount);
    if (paymentAmount < MINIMUM_PAYMENT) {
      Alert.alert(
        'Invalid Payment Amount', 
        `Minimum payment amount is ₱${MINIMUM_PAYMENT}. Your current amount is ₱${amount}.`
      );
      return;
    }

    try {
      setLoading(true);
      
      const token = await getToken();
      const userId = await getUserId();

      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('subscription_id', subscription?.subscription_id || params.subscription_id);
      uploadData.append('amount', amount);
      uploadData.append('reference_number', formData.referenceNumber);
      uploadData.append('gcash_number', formData.gcashNumber);
      uploadData.append('notes', formData.notes);
      
      // Add the image file
      uploadData.append('paymentProof', {
        uri: paymentProof.uri,
        type: 'image/jpeg',
        name: 'payment-proof.jpg'
      });

      const response = await fetch(`${API_BASE_URL}/api/manual-payments/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: uploadData
      });

      const data = await response.json();

      if (data.success) {
        // Handle different verification statuses
        const verificationStatus = data.verification_status || 'pending';
        
        if (verificationStatus === 'auto_verified') {
          // Auto-approved payment
          Alert.alert(
            '✅ Payment Approved!',
            'Your payment has been automatically verified and approved. Your subscription is now active!',
            [
              {
                text: 'Go to Home',
                onPress: () => router.push('/resident/HomePage'),
                style: 'default'
              },
              {
                text: 'View Subscription',
                onPress: () => router.push('/SubscriptionStatusScreen')
              }
            ]
          );
        } else if (verificationStatus === 'needs_review') {
          // Needs manual review
          Alert.alert(
            '⏳ Under Review',
            'Your payment proof has been submitted and is under manual review. You will receive a notification once it\'s processed.',
            [
              {
                text: 'Go to Home',
                onPress: () => router.push('/resident/HomePage'),
                style: 'default'
              },
              {
                text: 'Check Status',
                onPress: () => router.push('/SubscriptionStatusScreen')
              }
            ]
          );
        } else if (verificationStatus === 'auto_rejected') {
          // Auto-rejected payment
          Alert.alert(
            '❌ Payment Issue Detected',
            data.message || 'There was an issue with your payment proof. Please check the details and try again.',
            [
              {
                text: 'Try Again',
                onPress: () => {
                  // Reset form
                  setFormData({
                    referenceNumber: '',
                    gcashNumber: '',
                    notes: ''
                  });
                  setPaymentProof(null);
                }
              },
              {
                text: 'Go Back',
                onPress: () => router.back(),
                style: 'cancel'
              }
            ]
          );
        } else {
          // Default pending status
          Alert.alert(
            '📤 Payment Submitted!',
            'Your payment proof has been submitted for verification. You will receive a notification once it\'s approved.',
            [
              {
                text: 'Go to Home',
                onPress: () => router.push('/resident/HomePage'),
                style: 'default'
              },
              {
                text: 'Check Status',
                onPress: () => router.push('/SubscriptionStatusScreen')
              }
            ]
          );
        }
      } else {
        // Enhanced error handling with specific error codes
        const errorCode = data.errorCode || 'UNKNOWN_ERROR';
        let errorTitle = 'Submission Error';
        let errorMessage = data.message || 'Failed to submit payment proof';
        let actions = [
          {
            text: 'Try Again',
            onPress: () => {}
          }
        ];

        switch (errorCode) {
          case 'DUPLICATE_IMAGE':
            errorTitle = '🔄 Duplicate Submission';
            actions = [
              {
                text: 'Choose Different Image',
                onPress: () => setPaymentProof(null)
              },
              {
                text: 'Go Back',
                onPress: () => router.back(),
                style: 'cancel'
              }
            ];
            break;
            
          case 'RATE_LIMITED':
            errorTitle = '⏰ Too Many Attempts';
            actions = [
              {
                text: 'Go to Home',
                onPress: () => router.push('/resident/HomePage')
              }
            ];
            break;
            
          case 'NO_SUBSCRIPTION':
            errorTitle = '📋 No Subscription Found';
            actions = [
              {
                text: 'Go to Home',
                onPress: () => router.push('/resident/HomePage'),
                style: 'cancel'
              },
              {
                text: 'Subscribe Now',
                onPress: () => router.push('/Subscription')
              }
            ];
            break;
            
          case 'WRONG_SUBSCRIPTION_ID':
            errorTitle = '🔍 Subscription Mismatch';
            actions = [
              {
                text: 'Go Back',
                onPress: () => router.back(),
                style: 'cancel'
              },
              {
                text: 'Check Subscription',
                onPress: () => router.push('/SubscriptionStatusScreen')
              }
            ];
            break;
            
          default:
            actions = [
              {
                text: 'Try Again',
                onPress: () => {}
              },
              {
                text: 'Go Back',
                onPress: () => router.back(),
                style: 'cancel'
              }
            ];
        }

        Alert.alert(errorTitle, errorMessage, actions);
      }

    } catch (error) {
      console.error('Error submitting payment:', error);
      Alert.alert('Error', 'Failed to submit payment proof. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual GCash Payment</Text>
      </View>

      {/* Payment Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📱 Payment Instructions</Text>
        <Text style={styles.instructionsText}>
          1. Send ₱{amount} to the GCash number below{'\n'}
          2. Take a screenshot of your payment confirmation{'\n'}
          3. Upload the screenshot and fill in the details{'\n'}
          4. System will automatically verify your payment
        </Text>
      </View>

      {/* Important Notice */}
      <View style={styles.warningCard}>
        <Ionicons name="warning" size={20} color="#ff6b35" />
        <Text style={styles.warningText}>
          <Text style={styles.warningBold}>IMPORTANT:</Text> Payment must be sent to exactly{' '}
          <Text style={styles.warningBold}>{GCASH_DETAILS.number}</Text> and minimum amount is{' '}
          <Text style={styles.warningBold}>₱{MINIMUM_PAYMENT}</Text> for automatic verification.
        </Text>
      </View>

      {/* GCash Details */}
      <View style={styles.gcashCard}>
        <Text style={styles.gcashTitle}>💰 Send Payment To:</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>GCash Number:</Text>
          <Text style={styles.detailValue}>{GCASH_DETAILS.number}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Account Name:</Text>
          <Text style={styles.detailValue}>{GCASH_DETAILS.name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Merchant:</Text>
          <Text style={styles.detailValue}>{GCASH_DETAILS.merchant}</Text>
        </View>
        
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount to Send:</Text>
          <Text style={styles.amountValue}>₱{amount}</Text>
        </View>
      </View>

      {/* Upload Payment Proof */}
      <View style={styles.uploadCard}>
        <Text style={styles.uploadTitle}>📸 Upload Payment Proof</Text>
        
        {paymentProof ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: paymentProof.uri }} style={styles.previewImage} />
            <TouchableOpacity onPress={showImagePicker} style={styles.changeImageButton}>
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={showImagePicker} style={styles.uploadButton}>
            <Ionicons name="cloud-upload" size={32} color="#007bff" />
            <Text style={styles.uploadButtonText}>Tap to Upload Screenshot</Text>
            <Text style={styles.uploadHint}>JPG, PNG up to 5MB</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Details Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>📝 Payment Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your GCash Number *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 09123456789"
            value={formData.gcashNumber}
            onChangeText={(text) => setFormData({...formData, gcashNumber: text})}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reference Number (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="GCash reference number if available"
            value={formData.referenceNumber}
            onChangeText={(text) => setFormData({...formData, referenceNumber: text})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Any additional notes about your payment"
            value={formData.notes}
            onChangeText={(text) => setFormData({...formData, notes: text})}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={submitPayment}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Submitting...' : 'Submit for Verification'}
        </Text>
      </TouchableOpacity>

      {/* Final Warning */}
      <View style={styles.warningCard}>
        <Ionicons name="warning" size={20} color="#ff6b35" />
        <Text style={styles.warningText}>
          Please ensure your payment screenshot clearly shows the amount, recipient, and transaction details. 
          Screenshots with wrong GCash number or amount below ₱{MINIMUM_PAYMENT} will be automatically rejected.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  instructionsCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  gcashCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  gcashTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  uploadCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  changeImageButton: {
    marginTop: 8,
    padding: 8,
  },
  changeImageText: {
    color: '#007bff',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#28a745',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    lineHeight: 16,
  },
  warningBold: {
    fontWeight: 'bold',
    color: '#721c24',
  },
});

export default ManualGCashPayment;
