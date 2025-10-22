import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Clipboard functionality replaced with Alert dialogs

const EnhancedGCashPayment = ({ route, navigation }) => {
  const {
    payment_reference,
    amount,
    merchant_info,
    payment_options,
    instructions,
    subscription_id
  } = route.params;

  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert('Payment Expired', 'This payment link has expired. Please create a new payment.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenGCash = async () => {
    try {
      console.log('🚀 Attempting to open GCash app...');
      console.log('🔗 Payment options received:', payment_options);
      
      // Parse payment options if they're strings
      let parsedOptions;
      try {
        parsedOptions = typeof payment_options === 'string' ? JSON.parse(payment_options) : payment_options;
        console.log('📋 Parsed payment options:', parsedOptions);
      } catch (parseError) {
        console.error('❌ Error parsing payment options:', parseError);
        Alert.alert(
          'Configuration Error',
          'Payment options are not properly configured. Please try again or use manual payment.',
          [
            { text: 'Manual Payment', onPress: handleManualPayment },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
      
      // Validate deep link exists
      if (!parsedOptions?.gcash_deep_link) {
        console.error('❌ GCash deep link not found in payment options');
        Alert.alert(
          'Deep Link Error',
          'GCash payment link is not available. Using manual payment instead.',
          [{ text: 'OK', onPress: handleManualPayment }]
        );
        return;
      }
      
      console.log('🔍 Checking GCash app availability...');
      console.log('🔗 Deep link to test:', parsedOptions.gcash_deep_link);
      
      // Try to open GCash app directly
      const gcashSupported = await Linking.canOpenURL(parsedOptions.gcash_deep_link);
      console.log('📱 GCash app supported:', gcashSupported);
      
      if (gcashSupported) {
        console.log('✅ GCash app detected, opening...');
        await Linking.openURL(parsedOptions.gcash_deep_link);
        console.log('🎉 Successfully opened GCash app');
      } else {
        console.log('⚠️ GCash app not installed, trying web fallback...');
        
        // Fallback to web version
        if (parsedOptions.gcash_web_link) {
          console.log('🌐 Trying web fallback:', parsedOptions.gcash_web_link);
          const webSupported = await Linking.canOpenURL(parsedOptions.gcash_web_link);
          
          if (webSupported) {
            console.log('✅ Opening GCash web version...');
            await Linking.openURL(parsedOptions.gcash_web_link);
          } else {
            console.log('❌ Web fallback also failed');
            throw new Error('Both app and web versions are not available');
          }
        } else {
          console.log('❌ No web fallback URL provided');
          throw new Error('GCash app not installed and no web fallback available');
        }
      }
    } catch (error) {
      console.error('❌ Error in handleOpenGCash:', error);
      console.error('📊 Error details:', {
        message: error.message,
        stack: error.stack,
        payment_options: payment_options
      });
      
      // Show detailed error alert with troubleshooting options
      Alert.alert(
        'Payment Error',
        `Unable to open GCash payment: ${error.message}\n\nPlease try one of the alternatives below.`,
        [
          { text: 'Install GCash', onPress: () => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/ph/app/gcash/id520948088' : 'https://play.google.com/store/apps/details?id=com.globe.gcash.android') },
          { text: 'Manual Payment', onPress: handleManualPayment },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleOpenPayMaya = async () => {
    try {
      console.log('💳 Attempting to open PayMaya app...');
      
      // Parse payment options if they're strings
      let parsedOptions;
      try {
        parsedOptions = typeof payment_options === 'string' ? JSON.parse(payment_options) : payment_options;
        console.log('📋 PayMaya options:', parsedOptions);
      } catch (parseError) {
        console.error('❌ Error parsing PayMaya options:', parseError);
        Alert.alert('Configuration Error', 'PayMaya payment options are not properly configured.');
        return;
      }
      
      if (!parsedOptions?.paymaya_deep_link) {
        console.error('❌ PayMaya deep link not found');
        Alert.alert('PayMaya Error', 'PayMaya payment link is not available.');
        return;
      }
      
      console.log('🔗 PayMaya deep link:', parsedOptions.paymaya_deep_link);
      const supported = await Linking.canOpenURL(parsedOptions.paymaya_deep_link);
      console.log('📱 PayMaya app supported:', supported);
      
      if (supported) {
        console.log('✅ Opening PayMaya app...');
        await Linking.openURL(parsedOptions.paymaya_deep_link);
      } else {
        console.log('⚠️ PayMaya app not installed');
        Alert.alert(
          'PayMaya Not Available', 
          'Please install the PayMaya app first.',
          [
            { text: 'Install PayMaya', onPress: () => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/ph/app/paymaya/id1090392962' : 'https://play.google.com/store/apps/details?id=com.paymaya.wallet') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error in handleOpenPayMaya:', error);
      Alert.alert('PayMaya Error', `Unable to open PayMaya: ${error.message}`);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      console.log(`📋 Showing copy dialog: ${label} = ${text}`);
      
      if (!text || text.trim() === '') {
        console.error('❌ Cannot copy empty text');
        Alert.alert('Copy Error', `${label} is empty or not available.`);
        return;
      }
      
      // Show alert with the text to copy manually
      Alert.alert(
        `${label}`,
        `Please copy this ${label}:\n\n${text}`,
        [
          {
            text: 'Done',
            style: 'default'
          }
        ]
      );
      
      console.log('✅ Copy dialog shown successfully');
    } catch (error) {
      console.error('❌ Error showing copy dialog:', error);
      Alert.alert('Copy Error', `Failed to show ${label}. Value: ${text}`);
    }
  };

  const handleManualPayment = () => {
    try {
      console.log('📝 Showing manual payment instructions...');
      
      // Parse merchant info if it's a string
      let parsedMerchantInfo;
      try {
        parsedMerchantInfo = typeof merchant_info === 'string' ? JSON.parse(merchant_info) : merchant_info;
        console.log('🏪 Parsed merchant info:', parsedMerchantInfo);
      } catch (parseError) {
        console.error('❌ Error parsing merchant info:', parseError);
        Alert.alert('Configuration Error', 'Merchant information is not properly configured.');
        return;
      }
      
      // Validate required information
      if (!parsedMerchantInfo?.gcash_number) {
        console.error('❌ GCash number not found in merchant info');
        Alert.alert('Configuration Error', 'GCash number is not available.');
        return;
      }
      
      if (!amount) {
        console.error('❌ Payment amount not available');
        Alert.alert('Configuration Error', 'Payment amount is not available.');
        return;
      }
      
      if (!payment_reference) {
        console.error('❌ Payment reference not available');
        Alert.alert('Configuration Error', 'Payment reference is not available.');
        return;
      }
      
      console.log('✅ All manual payment data validated');
      
      Alert.alert(
        'Manual Payment Instructions',
        `1. Open your GCash app\n2. Go to Send Money\n3. Enter number: ${parsedMerchantInfo.gcash_number}\n4. Enter amount: ₱${amount}\n5. Add reference: ${payment_reference}\n6. Complete the payment`,
        [
          { text: 'Copy Number', onPress: () => copyToClipboard(parsedMerchantInfo.gcash_number, 'GCash Number') },
          { text: 'Copy Reference', onPress: () => copyToClipboard(payment_reference, 'Reference') },
          { text: 'Copy Amount', onPress: () => copyToClipboard(amount.toString(), 'Amount') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('❌ Error in handleManualPayment:', error);
      Alert.alert('Manual Payment Error', `Unable to show manual payment instructions: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GCash Payment</Text>
          <View style={styles.timer}>
            <Ionicons name="time" size={16} color="#fff" />
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          </View>
        </View>

        {/* Payment Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amount}>₱{amount}</Text>
          <Text style={styles.merchant}>To: {merchant_info.name}</Text>
        </View>

        {/* Primary Action - Open in GCash */}
        <View style={styles.primarySection}>
          <TouchableOpacity style={styles.gcashButton} onPress={handleOpenGCash}>
            <View style={styles.gcashButtonContent}>
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/GCash_logo.png' }}
                style={styles.gcashLogo}
                resizeMode="contain"
              />
              <View style={styles.gcashButtonText}>
                <Text style={styles.gcashButtonTitle}>Open in GCash</Text>
                <Text style={styles.gcashButtonSubtitle}>Fastest way to pay</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.paymayaButton} onPress={handleOpenPayMaya}>
            <View style={styles.paymayaButtonContent}>
              <Text style={styles.paymayaText}>💳 Open in PayMaya</Text>
              <Ionicons name="chevron-forward" size={20} color="#00A651" />
            </View>
          </TouchableOpacity>
        </View>


        {/* Manual Payment Option */}
        <TouchableOpacity style={styles.manualButton} onPress={handleManualPayment}>
          <Ionicons name="information-circle-outline" size={20} color="#007bff" />
          <Text style={styles.manualButtonText}>Manual Payment Instructions</Text>
        </TouchableOpacity>

        {/* Payment Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Payment Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <TouchableOpacity onPress={() => copyToClipboard(payment_reference, 'Reference')}>
              <Text style={styles.detailValue}>{payment_reference} 📋</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GCash Number:</Text>
            <TouchableOpacity onPress={() => copyToClipboard(merchant_info.gcash_number, 'GCash Number')}>
              <Text style={styles.detailValue}>{merchant_info.gcash_number} 📋</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account Name:</Text>
            <Text style={styles.detailValue}>{merchant_info.account_name}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to Pay</Text>
          {instructions?.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{index + 1}</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  amountCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  merchant: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  },
  primarySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  gcashButton: {
    backgroundColor: '#007bff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  gcashButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gcashLogo: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  gcashButtonText: {
    flex: 1,
  },
  gcashButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  gcashButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  paymayaButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#00A651',
  },
  paymayaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymayaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A651',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  manualButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
    marginLeft: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    width: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
});

export default EnhancedGCashPayment;
