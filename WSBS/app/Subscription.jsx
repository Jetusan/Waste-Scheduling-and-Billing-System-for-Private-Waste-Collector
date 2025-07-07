import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TermsAndConditions from './TermsAndConditions';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

const plans = [
  {
    id: 'lite',
    name: 'Lite Plan',
    price: '₱99',
    priceValue: 99,
    bagsPerWeek: '1 bag',
    bagsPerMonth: '4 bags',
    extraBagCost: '₱30/bag',
    biodegradable: 'Optional at ₱50/bag',
    bottle: 'Optional at ₱100/bag',
    binakbak: 'Optional at ₱200/bag',
    pickup: 'Weekly (Residual only)',
    addon: '✅ Available',
    contract: '1 Year (Fixed)',
    preTermination: '₱200 if < 1 year',
  },
  {
    id: 'essential',
    name: 'Essential Plan',
    price: '₱149',
    priceValue: 149,
    bagsPerWeek: '2 bags',
    bagsPerMonth: '8 bags',
    extraBagCost: '₱30/bag',
    biodegradable: 'Optional at ₱50/bag',
    bottle: 'Optional at ₱100/bag',
    binakbak: 'Optional at ₱200/bag',
    pickup: 'Weekly (Residual only)',
    addon: '✅ Available',
    contract: '1 Year (Fixed)',
    preTermination: '₱200 if < 1 year',
  },
  {
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
  },
];

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
  const [selectedPlan, setSelectedPlan] = useState('full');
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [showTerms, setShowTerms] = useState(true); // Start with terms
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  const generateInvoice = () => {
    setShowInvoice(true);
  };

  const handleNext = () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan first');
      return;
    }
    generateInvoice();
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    setShowPlanSelection(true);
  };

  const handleTermsDecline = () => {
    setShowTerms(false);
    router.push('/resident/HomePage');
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleProceedToPayment = () => {
    setShowInvoice(false);
    setShowPaymentPage(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Map plan IDs to backend plan IDs (you may need to adjust these based on your database)
      const planIdMap = {
        'lite': 1,
        'essential': 2,
        'full': 3
      };

      // Prepare subscription data
      const subscriptionData = {
        resident_id: 1, // This should come from user authentication
        plan_id: planIdMap[selectedPlan],
        payment_method: selectedPaymentMethod.name
      };

      // Make API call to create subscription and invoice
      const response = await fetch(`${API_BASE_URL}/billing/mobile-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      // Show success message
      const paymentStatus = selectedPaymentMethod.id === 'gcash' ? 'Paid' : 'Pending';
      const message = selectedPaymentMethod.id === 'gcash' 
        ? `Your ${selectedPlanData.name} subscription has been created and payment processed successfully!\n\nPayment Method: ${selectedPaymentMethod.name}\nAmount: ${selectedPlanData.price}/month\nStatus: ${paymentStatus}`
        : `Your ${selectedPlanData.name} subscription has been created successfully!\n\nPayment Method: ${selectedPaymentMethod.name}\nAmount: ${selectedPlanData.price}/month\nStatus: ${paymentStatus}\n\nPlease pay the collector when they arrive.`;

      Alert.alert(
        'Success!',
        message,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowInvoice(false);
              setShowPaymentPage(false);
              setSelectedPaymentMethod(null);
              setIsProcessing(false);
              router.push('/resident/HomePage');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Subscription creation error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const PaymentPage = () => (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/resident/HomePage')}
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
            <Text style={styles.paymentSummaryValue}>{selectedPlanData.name}</Text>
          </View>
          <View style={styles.paymentSummaryRow}>
            <Text style={styles.paymentSummaryLabel}>Amount:</Text>
            <Text style={styles.paymentSummaryValue}>{selectedPlanData.price}</Text>
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
            {paymentMethods.map((method) => (
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
          {isProcessing ? 'Processing...' : `Pay ${selectedPlanData.price}`}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (showTerms) {
    return (
      <TermsAndConditions 
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    );
  }
  if (showPaymentPage) {
    return <PaymentPage />;
  }
  if (showInvoice) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/resident/HomePage')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.logo}>INVOICE</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 }]}>  
          {/* Invoice Content */}
          <View style={styles.invoiceContent}>
            {/* Invoice Header */}
            <View style={styles.invoiceInfo}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Invoice #:</Text>
                <Text style={styles.invoiceValue}>INV-{Date.now().toString().slice(-6)}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Date:</Text>
                <Text style={styles.invoiceValue}>{new Date().toLocaleDateString()}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Due Date:</Text>
                <Text style={styles.invoiceValue}>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</Text>
              </View>
            </View>
            {/* Customer Info */}
            <View style={styles.customerSection}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>John Doe</Text>
                <Text style={styles.customerAddress}>123 Main Street, City</Text>
                <Text style={styles.customerPhone}>+63 912 345 6789</Text>
              </View>
            </View>
            {/* Service Details */}
            <View style={styles.serviceSection}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              <View style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{selectedPlanData.name}</Text>
                  <Text style={styles.servicePrice}>{selectedPlanData.price}</Text>
                </View>
                <Text style={styles.serviceDescription}>
                  Monthly subscription for waste collection services
                </Text>
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceDetail}>• {selectedPlanData.bagsPerWeek} included per week</Text>
                  <Text style={styles.serviceDetail}>• {selectedPlanData.bagsPerMonth} included per month</Text>
                  <Text style={styles.serviceDetail}>• {selectedPlanData.pickup}</Text>
                  <Text style={styles.serviceDetail}>• {selectedPlanData.contract}</Text>
                </View>
              </View>
            </View>
            {/* Payment Summary */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Subtotal:</Text>
                <Text style={styles.paymentValue}>{selectedPlanData.price}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Tax:</Text>
                <Text style={styles.paymentValue}>₱0.00</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Processing Fee:</Text>
                <Text style={styles.paymentValue}>₱0.00</Text>
              </View>
              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>{selectedPlanData.price}</Text>
              </View>
            </View>
            {/* Terms */}
            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                ✓ Terms and conditions have been accepted{'\n'}
                By proceeding with this payment, you agree to our terms of service and billing policies.
                This subscription will automatically renew monthly unless cancelled.
              </Text>
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity 
          style={styles.proceedButton}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
              <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.logo}>PLANS</Text>
       </View>
        {/* Plan Options */}
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 }]}>  
          <View style={styles.planContainerVertical}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCardVertical,
                  selectedPlan === plan.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.95}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price} <Text style={styles.perMonth}>/ month</Text></Text>
                <TouchableOpacity
                  style={styles.detailedButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setExpandedPlan(expandedPlan === plan.id ? null : plan.id);
                  }}
                >
                  <Text style={styles.detailedButtonText}>{expandedPlan === plan.id ? 'Hide Details' : 'Detailed'}</Text>
                </TouchableOpacity>
                {expandedPlan === plan.id && (
                  <View style={styles.detailsWrapper}>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionHeader}>Residual Bags</Text>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Included/week:</Text> <Text style={styles.featureValue}>{plan.bagsPerWeek}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Included/month:</Text> <Text style={styles.featureValue}>{plan.bagsPerMonth}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Extra Bag Cost:</Text> <Text style={styles.featureValue}>{plan.extraBagCost}</Text></View>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionHeader}>Optional Pickups</Text>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Biodegradable:</Text> <Text style={styles.featureValue}>{plan.biodegradable}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Bottle:</Text> <Text style={styles.featureValue}>{plan.bottle}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Binakbak:</Text> <Text style={styles.featureValue}>{plan.binakbak}</Text></View>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionHeader}>Other Details</Text>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Pickup Frequency:</Text> <Text style={styles.featureValue}>{plan.pickup}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Add-on Support:</Text> <Text style={styles.featureValue}>{plan.addon}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Contract Term:</Text> <Text style={styles.featureValue}>{plan.contract}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.featureLabel}>Pre-Termination Fee:</Text> <Text style={styles.featureValue}>{plan.preTermination}</Text></View>
                  </View>
                )}
                {selectedPlan === plan.id && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.badgeText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.bottomSection}>
          <Text style={styles.termsNote}>
            By clicking &quot;Next&quot;, you agree to review and accept our Terms and Conditions
          </Text>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
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
});
