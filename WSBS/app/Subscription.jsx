import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TermsAndConditions from './TermsAndConditions';
import { getToken, getUserId } from './auth';
import Invoice from './Invoice';
import * as Linking from 'expo-linking';
import PaymentPage from './PaymentPage';
import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single plan - Full Plan only
const singlePlan = {
  id: 'full',
  name: 'Full Plan',
  price: '₱199',
  priceValue: 199,
  bagsPerWeek: '3 bags',
  bagsPerMonth: '12 bags',
  extraBagCost: '₱30/bag',
  biodegradable: 'Optional at ₱50/bag',
  bottle: 'Optional at ₱100/bag',
  binakbak: 'Optional at ₱200/bag',
  pickup: 'Weekly (Residual only)',
  addon: '✅ Available',
  contract: '1 Year (Fixed)',
  preTermination: '₱200 if < 1 year',
};

const paymentMethods = [
  {
    id: 'gcash',
    name: 'GCash',
    icon: 'phone-portrait',
    description: 'Pay using GCash mobile wallet',
    color: '#0066CC'
  },
  {
    id: 'cash',
    name: 'Cash on Collection',
    icon: 'cash',
    description: 'Pay cash when collector arrives',
    color: '#28A745'
  }
];

const Subscription = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [showTerms, setShowTerms] = useState(false); // Will be set based on previous acceptance
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkingTerms, setCheckingTerms] = useState(true);
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // Check if user has previously accepted terms
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const userId = await getUserId();
        const termsKey = `terms_accepted_${userId}`;
        const hasAcceptedTerms = await AsyncStorage.getItem(termsKey);
        
        if (hasAcceptedTerms === 'true') {
          setTermsAccepted(true);
          setShowPlanSelection(true); // Skip terms, go directly to plan selection
        } else {
          setShowTerms(true); // Show terms for first-time users
        }
      } catch (error) {
        console.error('Error checking terms acceptance:', error);
        setShowTerms(true); // Default to showing terms if error
      } finally {
        setCheckingTerms(false);
      }
    };
    
    checkTermsAcceptance();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const token = await getToken();
        if (!token) {
          setProfileError('No authentication token found.');
          setProfileLoading(false);
          return;
        }
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setProfileError(data.message || 'Failed to fetch profile');
        } else {
          setUserProfile(data.user);
        }
      } catch (err) {
        setProfileError(err.message || 'An error occurred');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const selectedPlanData = singlePlan;

  // Remove payment-related state and functions
  // Remove: selectedPaymentMethod, isProcessing, handlePaymentMethodSelect, handleConfirmPayment, handleGcashPayment

  const handleTermsAccept = async () => {
    try {
      // Save terms acceptance to AsyncStorage
      const userId = await getUserId();
      const termsKey = `terms_accepted_${userId}`;
      await AsyncStorage.setItem(termsKey, 'true');
      
      setTermsAccepted(true);
      setShowTerms(false);
      setShowPlanSelection(true);
      
      console.log('✅ Terms & Conditions accepted and saved for user:', userId);
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
      // Still proceed even if saving fails
      setShowTerms(false);
      setShowPlanSelection(true);
    }
  };

  const handleTermsDecline = () => {
    setShowTerms(false);
    router.push('/resident/HomePage');
  };

  const handleProceedToInvoice = () => {
    setShowPlanSelection(false);
    setShowInvoice(true);
  };

  const handleProceedToPayment = () => {
    setShowInvoice(false);
    setShowPaymentPage(true);
  };

  // PaymentPage navigation handlers
  const handlePaymentBack = () => {
    setShowPaymentPage(false);
    setShowInvoice(true);
  };
  const handlePaymentSuccess = () => {
    setShowPaymentPage(false);
    setShowPlanSelection(true);
    
    // Navigate to payment success page with unique session ID
    const sessionId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    router.push(`/payment/success?session=${sessionId}`);
  };

  // Show loading while checking terms acceptance
  if (checkingTerms) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showTerms) {
    return (
      <TermsAndConditions 
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    );
  }
  if (showPaymentPage) {
    return (
      <PaymentPage
        selectedPlanData={selectedPlanData}
        paymentMethods={paymentMethods}
        onBack={handlePaymentBack}
        onSuccess={handlePaymentSuccess}
      />
    );
  }
  if (showInvoice) {
    return (
      <Invoice
        selectedPlanData={selectedPlanData}
        userProfile={userProfile}
        profileLoading={profileLoading}
        profileError={profileError}
        onProceed={handleProceedToPayment}
        onBack={() => {
          setShowInvoice(false);
          setShowPlanSelection(true);
        }}
      />
    );
  }
  if (showPlanSelection) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/resident/HomePage')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
              <Text>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Text>
          </TouchableOpacity>
          <Text style={styles.logo}>PLANS</Text>
       </View>
        {/* Single Plan Display */}
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 }]}>  
          <View style={styles.planContainerVertical}>
            <View style={[styles.planCardVertical, styles.selectedCard]}>
              <Text style={styles.planName}>{singlePlan.name}</Text>
              <Text style={styles.planPrice}>{singlePlan.price} <Text style={styles.perMonth}>/ month</Text></Text>
              <TouchableOpacity
                style={styles.detailedButton}
                onPress={() => setShowDetails(!showDetails)}
              >
                <Text style={styles.detailedButtonText}>{showDetails ? 'Hide Details' : 'Show Details'}</Text>
              </TouchableOpacity>
              {showDetails && (
                <View style={styles.detailsWrapper}>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionHeader}>Residual Bags</Text>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Included/week:</Text> <Text style={styles.featureValue}>{singlePlan.bagsPerWeek}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Included/month:</Text> <Text style={styles.featureValue}>{singlePlan.bagsPerMonth}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Extra Bag Cost:</Text> <Text style={styles.featureValue}>{singlePlan.extraBagCost}</Text></View>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionHeader}>Optional Pickups</Text>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Biodegradable:</Text> <Text style={styles.featureValue}>{singlePlan.biodegradable}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Bottle:</Text> <Text style={styles.featureValue}>{singlePlan.bottle}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Binakbak:</Text> <Text style={styles.featureValue}>{singlePlan.binakbak}</Text></View>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionHeader}>Other Details</Text>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Pickup Frequency:</Text> <Text style={styles.featureValue}>{singlePlan.pickup}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Add-on Support:</Text> <Text style={styles.featureValue}>{singlePlan.addon}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Contract Term:</Text> <Text style={styles.featureValue}>{singlePlan.contract}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.featureLabel}>Pre-Termination Fee:</Text> <Text style={styles.featureValue}>{singlePlan.preTermination}</Text></View>
                </View>
              )}
              <View style={styles.recommendedBadge}>
                <Text style={styles.badgeText}>Our Plan</Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={styles.bottomSection}>
          <Text style={styles.termsNote}>
            By clicking &quot;Subscribe Now&quot;, you agree to review and accept our Terms and Conditions
          </Text>
          <TouchableOpacity style={styles.nextButton} onPress={handleProceedToInvoice}>
            <Text style={styles.nextButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  // Default: Show Plan Selection
  return null;
};

export default Subscription;

const styles = StyleSheet.create({
    backButton: {
  position: 'absolute',
  left: 20,
},


  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
  },
  logo: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOut: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  stepText: {
    color: '#888',
    marginBottom: 5,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  features: {
    marginBottom: 20,
  },
  featureText: {
    fontSize: 14,
    marginBottom: 5,
  },
  planContainerVertical: {
    flexDirection: 'column',
    gap: 0,
    width: '100%',
    alignItems: 'center',
  },
  planCardVertical: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 18,
    width: '95%',
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: 22,
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  planPrice: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  perMonth: {
    color: '#888',
    fontWeight: 'normal',
    fontSize: 13,
  },
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  featureLabel: {
    fontWeight: '600',
    color: '#222',
    fontSize: 13,
    flex: 1,
  },
  featureValue: {
    color: '#444',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  termsNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
  },
  nextButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  detailedButton: {
    marginTop: 6,
    marginBottom: 2,
    alignSelf: 'flex-end',
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  detailedButtonText: {
    color: '#388e3c',
    fontWeight: 'bold',
    fontSize: 13,
  },
  detailsWrapper: {
    width: '100%',
    marginTop: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  paymentModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  invoiceContent: {
    flex: 1,
  },
  invoiceInfo: {
    marginBottom: 20,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  invoiceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  customerSection: {
    marginBottom: 20,
  },
  serviceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  customerInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  customerAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  serviceItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  serviceDetails: {
    marginTop: 10,
  },
  serviceDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  termsSection: {
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    textAlign: 'center',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Payment Method Styles
  paymentMethodsContainer: {
    marginBottom: 20,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
  },
  selectedPaymentMethod: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  paymentMethodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedPaymentText: {
    color: '#fff',
  },
  checkmark: {
    marginLeft: 10,
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentSummaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentSummaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethodsSection: {
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gcashButton: { backgroundColor: '#34c759', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  gcashButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
