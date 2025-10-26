import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from './config';

const UploadReceiptPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [gcashReference, setGcashReference] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Parse parameters
  const paymentReference = params.payment_reference;
  const amount = params.amount;
  const merchantInfo = params.merchant_info ? JSON.parse(params.merchant_info) : {};

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload receipt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to take a photo of your receipt.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Upload Receipt',
      'Choose how you want to add your GCash receipt:',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!gcashReference.trim()) {
      Alert.alert('Missing Information', 'Please enter your GCash reference number.');
      return;
    }

    if (!receiptImage) {
      Alert.alert('Missing Receipt', 'Please upload a screenshot of your GCash receipt.');
      return;
    }

    setIsUploading(true);

    try {
      const receiptBase64 = `data:image/jpeg;base64,${receiptImage.base64}`;

      const response = await fetch(`${API_BASE_URL}/api/billing/upload-gcash-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_reference: paymentReference,
          gcash_reference: gcashReference.trim(),
          receipt_image: receiptBase64
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.verification_result && data.verification_result.isValid) {
          // OCR verification successful - payment verified and receipt generated
          Alert.alert(
            'Payment Verified! ✅',
            'Your GCash payment has been automatically verified and your subscription is now active. Your official receipt is ready to view.',
            [
              { 
                text: 'View Receipt', 
                onPress: () => {
                  // Navigate directly to receipt page
                  router.replace('/ReceiptPage');
                }
              },
              { 
                text: 'Go to Dashboard', 
                onPress: () => router.replace('/resident/dashboard')
              }
            ]
          );
        } else {
          // OCR verification failed or pending
          Alert.alert(
            'Receipt Uploaded',
            data.verification_result ? 
              'Payment verification failed. Please ensure your GCash receipt is clear and shows the correct amount and recipient.' :
              'Your receipt has been uploaded and is being verified. You will be notified once verification is complete.',
            [
              { 
                text: 'OK', 
                onPress: () => router.replace('/resident/dashboard')
              }
            ]
          );
        }
      } else {
        Alert.alert('Error', data.error || 'Failed to upload receipt. Please try again.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Failed to upload receipt. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Receipt</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Info */}
        <View style={styles.paymentInfoCard}>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>₱{amount}</Text>
          <Text style={styles.merchantName}>{merchantInfo.name}</Text>
          <Text style={styles.referenceText}>Ref: {paymentReference}</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Upload Instructions</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#28A745" />
            <Text style={styles.instructionText}>
              Complete your GCash payment first
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="camera" size={20} color="#0066CC" />
            <Text style={styles.instructionText}>
              Take a screenshot of your GCash receipt
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="document-text" size={20} color="#FFA500" />
            <Text style={styles.instructionText}>
              Enter your GCash reference number
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="cloud-upload" size={20} color="#6F42C1" />
            <Text style={styles.instructionText}>
              Upload the receipt for verification
            </Text>
          </View>
        </View>

        {/* GCash Reference Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>GCash Reference Number *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your GCash reference number"
            value={gcashReference}
            onChangeText={setGcashReference}
            autoCapitalize="characters"
            maxLength={20}
          />
          <Text style={styles.inputHint}>
            Find this in your GCash transaction receipt
          </Text>
        </View>

        {/* Receipt Upload */}
        <View style={styles.uploadCard}>
          <Text style={styles.uploadLabel}>Receipt Screenshot *</Text>
          
          {receiptImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: receiptImage.uri }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={showImageOptions}
              >
                <Ionicons name="pencil" size={16} color="#fff" />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={showImageOptions}
            >
              <Ionicons name="cloud-upload" size={32} color="#0066CC" />
              <Text style={styles.uploadButtonText}>Upload Receipt</Text>
              <Text style={styles.uploadButtonSubtext}>
                Tap to take photo or choose from gallery
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            (!gcashReference.trim() || !receiptImage || isUploading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!gcashReference.trim() || !receiptImage || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle" size={20} color="#0066CC" />
          <Text style={styles.noteText}>
            Your payment will be verified by our admin team. You'll receive a notification once confirmed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  paymentInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 10,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  referenceText: {
    fontSize: 14,
    color: '#666',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: '#666',
  },
  uploadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 10,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  imagePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 250,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  changeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#0066CC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#28A745',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  noteCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  noteText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});

export default UploadReceiptPage;
