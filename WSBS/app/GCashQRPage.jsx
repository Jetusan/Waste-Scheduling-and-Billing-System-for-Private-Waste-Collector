import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from './config';

const GCashQRPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Parse parameters
  const qrCode = params.qr_code;
  const paymentReference = params.payment_reference;
  const amount = params.amount;
  const merchantInfo = params.merchant_info ? JSON.parse(params.merchant_info) : {};
  const instructions = params.instructions ? JSON.parse(params.instructions) : [];
  const subscriptionId = params.subscription_id;

  // Poll payment status
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/billing/gcash-qr-status/${paymentReference}`);
        const data = await response.json();
        
        if (data.success) {
          setPaymentStatus(data.payment.status);
          
          if (data.payment.status === 'verified') {
            Alert.alert(
              'Payment Confirmed!',
              'Your subscription has been activated successfully.',
              [{ text: 'OK', onPress: () => router.replace('/resident/dashboard') }]
            );
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    // Check status every 10 seconds
    const interval = setInterval(checkPaymentStatus, 10000);
    
    // Initial check
    checkPaymentStatus();

    return () => clearInterval(interval);
  }, [paymentReference]);

  const handleUploadReceipt = () => {
    // Navigate to receipt upload page
    router.push({
      pathname: '/UploadReceiptPage',
      params: {
        payment_reference: paymentReference,
        amount: amount,
        merchant_info: JSON.stringify(merchantInfo)
      }
    });
  };

  const handleBack = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to go back? Your payment session will be cancelled.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Go Back', onPress: () => router.back() }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GCash QR Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Info */}
        <View style={styles.paymentInfoCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>₱{amount}</Text>
          <Text style={styles.merchantName}>{merchantInfo.name}</Text>
          <Text style={styles.referenceText}>Ref: {paymentReference}</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Scan QR Code with GCash</Text>
          <View style={styles.qrCodeWrapper}>
            <Image 
              source={{ uri: qrCode }} 
              style={styles.qrCodeImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.qrSubtitle}>
            or Log in to GCash and scan this QR with the QR Scanner
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Payment Instructions</Text>
          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>{index + 1}</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={paymentStatus === 'verified' ? 'checkmark-circle' : 'time'} 
              size={24} 
              color={paymentStatus === 'verified' ? '#28A745' : '#FFA500'} 
            />
            <Text style={[
              styles.statusText,
              { color: paymentStatus === 'verified' ? '#28A745' : '#FFA500' }
            ]}>
              {paymentStatus === 'verified' ? 'Payment Confirmed' : 'Waiting for Payment'}
            </Text>
          </View>
          
          {paymentStatus === 'pending' && (
            <Text style={styles.statusSubtext}>
              Complete the payment in your GCash app, then upload your receipt below.
            </Text>
          )}
        </View>

        {/* Upload Receipt Button */}
        {paymentStatus === 'pending' && (
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={handleUploadReceipt}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Timer */}
        <View style={styles.timerCard}>
          <Ionicons name="time" size={20} color="#666" />
          <Text style={styles.timerText}>This QR code expires in 30 minutes</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 10,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  referenceText: {
    fontSize: 14,
    color: '#666',
  },
  qrContainer: {
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
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  qrCodeWrapper: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  qrCodeImage: {
    width: 250,
    height: 250,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
    marginRight: 10,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  uploadButton: {
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
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  timerCard: {
    backgroundColor: '#fff',
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
  timerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

export default GCashQRPage;
