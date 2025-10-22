import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { getToken } from './auth';
import { useRouter } from 'expo-router';

const PaymentPage = ({
  selectedPlanData,
  paymentMethods,
  onBack,
  onSuccess
}) => {
  const router = useRouter();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [hasProcessedSuccess, setHasProcessedSuccess] = useState(false);

  // Enhanced deep linking with subscription activation
  const handleDeepLink = React.useCallback(async (event) => {
    console.log('🔗 Deep link received:', event.url);
    
    if (event.url.includes('wsbs://payment/success') || event.url.includes('payment/success')) {
      // Prevent processing the same success multiple times
      if (hasProcessedSuccess) {
        console.log('🔄 Payment success already processed, ignoring...');
        return;
      }
      
      try {
        console.log('✅ Payment success detected');
        setHasProcessedSuccess(true);
        
        // Get stored subscription and payment data
        const pendingPaymentId = await AsyncStorage.getItem('pendingPaymentId');
        const pendingSubscriptionId = await AsyncStorage.getItem('pendingSubscriptionId');
        
        console.log('📦 Pending data:', { pendingPaymentId, pendingSubscriptionId });
        
        if (pendingPaymentId && pendingSubscriptionId) {
          // Confirm payment and activate subscription
          const token = await getToken();
          const confirmResponse = await fetch(`${API_BASE_URL}/api/billing/confirm-gcash-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              source_id: pendingPaymentId,
              subscription_id: pendingSubscriptionId
            })
          });
          
          const confirmData = await confirmResponse.json();
          console.log('🔄 Confirmation response:', confirmData);
          
          if (confirmData.success) {
            // Clear stored data
            await AsyncStorage.removeItem('pendingPaymentId');
            await AsyncStorage.removeItem('pendingSubscriptionId');
            
            // Hide any existing alerts and show success
            setTimeout(() => {
              Alert.alert(
                '🎉 Subscription Activated!', 
                'Your payment was successful and subscription is now active!', 
                [{ 
                  text: 'Continue', 
                  onPress: () => {
                    setIsProcessing(false);
                    // Navigate directly to HomePage instead of calling onSuccess
                    router.replace('/resident/HomePage');
                  }
                }]
              );
            }, 100);
          } else {
            Alert.alert('⚠️ Payment Issue', 'Payment successful but subscription activation failed. Please contact support.');
            setIsProcessing(false);
          }
        } else {
          // No pending data, just show success
          setTimeout(() => {
            Alert.alert(
              '✅ Payment Successful!', 
              'Your payment has been processed successfully.', 
              [{ 
                text: 'Continue', 
                onPress: () => {
                  setIsProcessing(false);
                  // Navigate directly to HomePage instead of calling onSuccess
                  router.replace('/resident/HomePage');
                }
              }]
            );
          }, 100);
        }
      } catch (error) {
        console.error('❌ Error handling payment success:', error);
        setTimeout(() => {
          Alert.alert(
            '✅ Payment Successful!', 
            'Your payment has been processed successfully.', 
            [{ 
              text: 'Continue', 
              onPress: () => {
                setIsProcessing(false);
                // Navigate directly to HomePage instead of calling onSuccess
                router.replace('/resident/HomePage');
              }
            }]
          );
        }, 100);
      }
    } else if (event.url.includes('wsbs://payment/failed') || event.url.includes('payment/failed')) {
      console.log('❌ Payment failed detected');
      Alert.alert('❌ Payment Failed', 'Your payment could not be processed. Please try again.');
      setIsProcessing(false);
    }
  }, [hasProcessedSuccess, router]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription?.remove();
      // Reset success state when component unmounts
      setHasProcessedSuccess(false);
    };
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
      // First, create the subscription
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        setIsProcessing(false);
        return;
      }

      // Get user profile to extract user_id
      const profileResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        Alert.alert('Error', 'Failed to get user information');
        setIsProcessing(false);
        return;
      }

      // Single plan system - no plan_id needed (backend will use ₱199 plan)
      const subscriptionPayload = {
        payment_method: selectedPaymentMethod.id === 'gcash' ? 'gcash' : 'cash'
      };

      const subscriptionResponse = await fetch(`${API_BASE_URL}/api/billing/mobile-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscriptionPayload)
      });

      const subscriptionResult = await subscriptionResponse.json();
      
      if (!subscriptionResult.success) {
        Alert.alert('Error', subscriptionResult.error || 'Failed to create subscription');
        setIsProcessing(false);
        return;
      }

      setSubscriptionData(subscriptionResult);

      // Handle payment method specific logic
      if (selectedPaymentMethod.id === 'gcash') {
        await handleGcashPayment(subscriptionResult);
      } else if (selectedPaymentMethod.id === 'gcash_qr') {
        await handleGcashQRPayment(subscriptionResult);
      } else {
        // Cash on Collection - Show success message
        Alert.alert(
          'Subscription Created!', 
          subscriptionResult.instructions,
          [{ text: 'OK', onPress: onSuccess }]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
    setIsProcessing(false);
  };

  // Enhanced payment status polling with subscription activation
  const pollPaymentStatus = async (sourceId, subscriptionId) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/billing/payment-status/${sourceId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          // Confirm payment and activate subscription
          const token = await getToken();
          const confirmResponse = await fetch(`${API_BASE_URL}/api/billing/confirm-gcash-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              source_id: sourceId,
              subscription_id: subscriptionId
            })
          });
          
          const confirmData = await confirmResponse.json();
          
          if (confirmData.success) {
            // Clear stored payment data
            await AsyncStorage.removeItem('pendingPaymentId');
            await AsyncStorage.removeItem('pendingSubscriptionId');
            
            Alert.alert(
              'Payment Successful!', 
              'Your subscription has been activated successfully!', 
              [{ 
                text: 'OK', 
                onPress: () => router.replace('/resident/HomePage')
              }]
            );
          } else {
            Alert.alert('Error', 'Payment confirmed but subscription activation failed. Please contact support.');
          }
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

  const handleGcashPayment = async (subscriptionResult) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/create-gcash-source`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Type': 'mobile'  // Identify as mobile client for deep linking
        },
        body: JSON.stringify({ 
          amount: selectedPlanData.priceValue * 100, // Convert to centavos
          description: `Payment for ${selectedPlanData.name} subscription`,
          isAdmin: false,
          client_type: 'mobile',  // Also in body for extra detection
          subscription_id: subscriptionResult.subscription.id,
          invoice_id: subscriptionResult.invoice.invoice_id
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
        // Store payment tracking data
        await AsyncStorage.setItem('pendingPaymentId', data.source_id);
        await AsyncStorage.setItem('pendingSubscriptionId', subscriptionResult.subscription.id.toString());
        
        // Open GCash payment page
        await Linking.openURL(data.checkout_url);
        
        // Start polling for payment status
        setTimeout(() => {
          pollPaymentStatus(data.source_id, subscriptionResult.subscription.id);
        }, 5000);
        
      } else {
        const errMsg = data.error ? JSON.stringify(data.error) : 'Failed to initiate GCash payment.';
        Alert.alert('GCash Error', errMsg);
      }
    } catch (error) {
      Alert.alert('Network Error', error.message);
    }
  };

  const handleGcashQRPayment = async (subscriptionResult) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/create-gcash-qr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          amount: selectedPlanData.priceValue,
          description: `Payment for ${selectedPlanData.name} subscription`,
          subscription_id: subscriptionResult.subscription.id,
          user_id: subscriptionResult.subscription.user_id
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.qr_code_image) {
        // Navigate to Enhanced GCash Payment screen
        router.push({
          pathname: '/EnhancedGCashPayment',
          params: {
            qr_code: data.qr_code_image,
            payment_reference: data.payment_reference,
            amount: data.amount,
            merchant_info: JSON.stringify(data.merchant_info),
            payment_options: JSON.stringify(data.payment_options || {}),
            instructions: JSON.stringify(data.instructions),
            subscription_id: subscriptionResult.subscription.id
          }
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to generate QR code');
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