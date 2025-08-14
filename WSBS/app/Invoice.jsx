import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const Invoice = ({ selectedPlanData, userProfile, profileLoading, profileError, onProceed, onBack }) => {
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
              {profileLoading ? (
                <Text>Loading customer info...</Text>
              ) : profileError ? (
                <Text style={{ color: 'red' }}>{profileError}</Text>
              ) : userProfile ? (
                <>
                  <Text style={styles.customerName}>{`${userProfile.first_name} ${userProfile.middle_name ? userProfile.middle_name + ' ' : ''}${userProfile.last_name}`.trim()}</Text>
                  <Text style={styles.customerAddress}>{`${userProfile.street}, ${userProfile.barangay_name}, ${userProfile.city_name}`}</Text>
                  <Text style={styles.customerPhone}>{userProfile.contact_number}</Text>
                </>
              ) : (
                <Text>No customer info found.</Text>
              )}
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
              ✓ Terms and conditions have been accepted{"\n"}
              By proceeding with this payment, you agree to our terms of service and billing policies.{"\n"}
              This subscription will automatically renew monthly unless cancelled.
            </Text>
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity 
        style={styles.proceedButton}
        onPress={onProceed}
      >
        <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

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
  content: {
    padding: 20,
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
  serviceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
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
});

export default Invoice; 