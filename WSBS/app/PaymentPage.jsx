import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const PaymentPage = ({
  selectedPlanData,
  paymentMethods,
  onBack,
  onSuccess
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle deep linking for payment results
  const handleDeepLink = React.useCallback((event) => {
    if (event.url.includes('wsbs://payment/success')) {
      Alert.alert('Payment Successful!', 'Your payment has been processed successfully.', [
        { text: 'OK', onPress: onSuccess }
      ]);
    } else if (event.url.includes('wsbs://payment/failed')) {
      Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.');
      setIsProcessing(false);
    }
  }, [onSuccess]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription?.remove();
  }, [handleDeepLink]);

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }
    setIsProcessing(true);
    try {
      // Example: You may want to call your backend to create a subscription or record payment here
      // For GCash, you may want to trigger handleGcashPayment instead
      if (selectedPaymentMethod.id === 'gcash') {
        await handleGcashPayment();
        setIsProcessing(false);
        return;
      }
      // For other payment methods, simulate success
      Alert.alert('Success!', `Payment for ${selectedPlanData.name} via ${selectedPaymentMethod.name} processed!`, [
        { text: 'OK', onPress: onSuccess }
      ]);
    } catch (_error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
    setIsProcessing(false);
  };

  // Payment status polling function
  const pollPaymentStatus = async (sourceId) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/billing/payment-status/${sourceId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          Alert.alert('Payment Successful!', 'Your payment has been processed successfully.', [
            { text: 'OK', onPress: onSuccess }
          ]);
          return;
        } else if (data.status === 'failed') {
          Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.');
          return;
        }
        
        // Wait 10 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }
    
    Alert.alert('Payment Timeout', 'Unable to confirm payment status. Please contact support if the amount was deducted.');
  };

  const handleGcashPayment = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/create-gcash-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: selectedPlanData.priceValue * 100, // Convert to centavos
          description: `Payment for ${selectedPlanData.name} subscription`,
          isAdmin: false
        })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (_jsonErr) {
        Alert.alert('GCash Error', 'Invalid response from payment server.');
        return;
      }
      
      if (data.checkout_url && data.source_id) {
        // Store source ID for tracking
        await AsyncStorage.setItem('pendingPaymentId', data.source_id);
        
        // Open GCash payment page
        await Linking.openURL(data.checkout_url);
        
        // Start polling for payment status as fallback
        setTimeout(() => {
          pollPaymentStatus(data.source_id);
        }, 5000); // Wait 5 seconds before starting to poll
        
      } else {
        const errMsg = data.error ? JSON.stringify(data.error) : 'Failed to initiate GCash payment.';
        Alert.alert('GCash Error', errMsg);
      }
    } catch (error) {
      Alert.alert('Network Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.logo}>PAYMENT</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 }]}>  
        {/* Payment Summary */}
        <View style={styles.paymentSummaryCard}>
          <Text style={styles.paymentSummaryTitle}>Payment Summary</Text>
          <View style={styles.paymentSummaryRow}>
            <Text style={styles.paymentSummaryLabel}>Plan:</Text>
            <Text style={styles.paymentSummaryValue}>{selectedPlanData?.name}</Text>
          </View>
          <View style={styles.paymentSummaryRow}>
            <Text style={styles.paymentSummaryLabel}>Amount:</Text>
            <Text style={styles.paymentSummaryValue}>{selectedPlanData?.price}</Text>
          </View>
          <View style={styles.paymentSummaryRow}>
            <Text style={styles.paymentSummaryLabel}>Billing Cycle:</Text>
            <Text style={styles.paymentSummaryValue}>Monthly</Text>
          </View>
        </View>
        {/* Payment Methods */}
        <View style={styles.paymentMethodsSection}>
          <Text style={styles.sectionTitle}>Choose Payment Method</Text>
          <View style={styles.paymentMethodsContainer}>
            {paymentMethods?.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => handlePaymentMethodSelect(method)}
              >
                <View style={styles.paymentMethodIcon}>
                  <Ionicons 
                    name={method.icon} 
                    size={24} 
                    color={selectedPaymentMethod?.id === method.id ? '#fff' : method.color} 
                  />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[
                    styles.paymentMethodName,
                    selectedPaymentMethod?.id === method.id && styles.selectedPaymentText
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={[
                    styles.paymentMethodDescription,
                    selectedPaymentMethod?.id === method.id && styles.selectedPaymentText
                  ]}>
                    {method.description}
                  </Text>
                </View>
                {selectedPaymentMethod?.id === method.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      {/* Confirm Payment Button */}
      <TouchableOpacity 
        style={[
          styles.confirmButton,
          !selectedPaymentMethod && styles.confirmButtonDisabled
        ]}
        onPress={handleConfirmPayment}
        disabled={!selectedPaymentMethod || isProcessing}
      >
        <Text style={styles.confirmButtonText}>
          {isProcessing ? 'Processing...' : `Pay ₱${selectedPlanData?.priceValue}`}
        </Text>
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#007bff',
  },
  backButton: {
    padding: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  content: {
    padding: 20,
  },
  paymentSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  paymentSummaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  paymentSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentMethodsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentMethodCard: {
    width: '48%', // Two columns
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedPaymentMethod: {
    borderColor: '#007bff',
    borderWidth: 2,
  },
  paymentMethodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentMethodInfo: {
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  confirmButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentPage;