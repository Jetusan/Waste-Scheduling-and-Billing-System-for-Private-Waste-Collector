import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../config';
import { getToken, getUserId } from '../auth';

const SpecialPickupInvoice = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Parse the request data from params
  useEffect(() => {
    if (params.requestData) {
      try {
        const data = JSON.parse(params.requestData);
        console.log('📋 Parsed request data:', data);
        generateInvoice(data);
      } catch (err) {
        console.error('❌ Error parsing request data:', err);
        setError('Invalid request data');
        setLoading(false);
      }
    } else {
      console.error('❌ No request data provided');
      setError('No request data provided');
      setLoading(false);
    }
  }, [params.requestData]); // Only depend on requestData, not the entire params object

  const generateInvoice = useCallback(async (requestData) => {
    try {
      console.log('🔄 Generating invoice for request data:', requestData);
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // Calculate pricing with potential discounts
      const pricingUrl = `${API_BASE_URL}/api/pricing/special-pickup-pricing?bagQuantity=${requestData.bagQuantity}&userType=${requestData.userType || 'regular'}`;
      console.log('🔄 Fetching pricing from:', pricingUrl);
      
      const response = await fetch(pricingUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Pricing API error:', response.status, errorText);
        throw new Error(`Pricing API error: ${response.status} - ${errorText}`);
      }
      
      const pricingData = await response.json();
      console.log('✅ Pricing data received:', pricingData);
      
      // Generate invoice number
      const invoiceNumber = `SP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      const invoice = {
        invoiceNumber,
        requestData,
        pricing: pricingData,
        generatedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
        status: 'pending_confirmation'
      };
      
      console.log('✅ Invoice generated successfully:', invoice);
      setInvoiceData(invoice);
    } catch (err) {
      console.error('❌ Error generating invoice:', err);
      setError(`Failed to generate invoice: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since we don't depend on any props or state

  const handleConfirmRequest = async () => {
    if (!invoiceData) return;
    
    Alert.alert(
      'Confirm Special Pickup Request',
      `Are you sure you want to submit this request for ${formatCurrency(invoiceData.pricing.finalPrice)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm & Submit', 
          onPress: submitRequest,
          style: 'default'
        }
      ]
    );
  };

  const submitRequest = async () => {
    try {
      setSubmitting(true);
      const token = await getToken();
      const userId = await getUserId();
      
      // Validate required data before submission
      if (!invoiceData.requestData.wasteTypes || !invoiceData.requestData.bagQuantity || !invoiceData.requestData.pickupDate) {
        throw new Error('Missing required fields: waste types, bag quantity, or pickup date');
      }
      
      if (!userId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      // Helper function to truncate text to fit database constraints
      const truncateText = (text, maxLength) => {
        if (!text) return "";
        return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
      };

      // Prepare the final request data with proper field mapping for backend
      const requestData = {
        user_id: userId,
        waste_type: truncateText(invoiceData.requestData.wasteTypes, 50), // Limit to 50 chars
        description: invoiceData.requestData.wasteTypes, // Full description (TEXT field, no limit)
        pickup_date: new Date(invoiceData.requestData.pickupDate).toISOString().split('T')[0], // Format as YYYY-MM-DD
        pickup_time: '09:00:00', // Default time since it's required by database
        address: invoiceData.requestData.address || 'Location will be confirmed by collector', // Required field
        notes: invoiceData.requestData.notes || "",
        message: invoiceData.requestData.message || "",
        bag_quantity: parseInt(invoiceData.requestData.bagQuantity) || 1,
        price_per_bag: parseFloat(invoiceData.pricing.pricePerBag) || 25.00,
        estimated_total: parseFloat(invoiceData.pricing.finalPrice) || 25.00,
        final_price: parseFloat(invoiceData.pricing.finalPrice) || 25.00,
        discount_applied: parseFloat(invoiceData.pricing.discount) || 0,
        discount_reason: invoiceData.pricing.discountReason || "",
        invoice_number: invoiceData.invoiceNumber
      };

      // Only include GPS coordinates if they're actually provided
      if (invoiceData.requestData.pickupLocation?.latitude && invoiceData.requestData.pickupLocation?.longitude) {
        requestData.pickup_latitude = parseFloat(invoiceData.requestData.pickupLocation.latitude);
        requestData.pickup_longitude = parseFloat(invoiceData.requestData.pickupLocation.longitude);
      }

      const finalRequestData = requestData;
      
      console.log('🔄 Submitting special pickup request:', finalRequestData);
      console.log('📅 Pickup date formatted:', finalRequestData.pickup_date);
      console.log('🆔 User ID:', finalRequestData.user_id);
      console.log('📦 Bag quantity:', finalRequestData.bag_quantity, typeof finalRequestData.bag_quantity);
      console.log('🗂️ Waste type (truncated):', finalRequestData.waste_type);
      console.log('📝 Full description:', finalRequestData.description);
      
      const response = await fetch(`${API_BASE_URL}/api/special-pickup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalRequestData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        Alert.alert(
          'Request Submitted Successfully!',
          'Your special pickup request has been submitted to the admin for review and assignment.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to special pickup list or home
                router.replace('/spickup');
              }
            }
          ]
        );
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error response:', response.status, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
    } catch (err) {
      console.error('❌ Error submitting request:', err);
      Alert.alert(
        'Submission Error', 
        `Failed to submit request: ${err.message}. Please check your data and try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Generating invoice...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!invoiceData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Special Pickup Invoice</Text>
        </View>

        {/* Invoice Card */}
        <View style={styles.invoiceCard}>
          {/* Invoice Header */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
          </View>

          {/* Invoice Details */}
          <View style={styles.invoiceDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Generated:</Text>
              <Text style={styles.detailValue}>{formatDate(invoiceData.generatedAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoiceData.dueDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Pending Confirmation</Text>
              </View>
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.serviceSection}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            
            <View style={styles.serviceItem}>
              <Text style={styles.serviceLabel}>Service Type:</Text>
              <Text style={styles.serviceValue}>Special Pickup</Text>
            </View>
            
            <View style={styles.serviceItem}>
              <Text style={styles.serviceLabel}>Waste Types:</Text>
              <Text style={styles.serviceValue}>{invoiceData.requestData.wasteTypes}</Text>
            </View>
            
            <View style={styles.serviceItem}>
              <Text style={styles.serviceLabel}>Pickup Date:</Text>
              <Text style={styles.serviceValue}>{formatDate(invoiceData.requestData.pickupDate)}</Text>
            </View>
            
            <View style={styles.serviceItem}>
              <Text style={styles.serviceLabel}>Pickup Location:</Text>
              <Text style={styles.serviceValue}>
                {invoiceData.requestData.address && (
                  <Text>{invoiceData.requestData.address}</Text>
                )}
                {invoiceData.requestData.pickupLocation && (
                  <Text>
                    {invoiceData.requestData.address ? '\n' : ''}📍 GPS: {invoiceData.requestData.pickupLocation.latitude?.toFixed(6)}, {invoiceData.requestData.pickupLocation.longitude?.toFixed(6)}
                  </Text>
                )}
                {!invoiceData.requestData.address && !invoiceData.requestData.pickupLocation && (
                  <Text style={{ fontStyle: 'italic', color: '#666' }}>Location will be confirmed by collector</Text>
                )}
              </Text>
            </View>
            
            {invoiceData.requestData.notes && (
              <View style={styles.serviceItem}>
                <Text style={styles.serviceLabel}>Special Instructions:</Text>
                <Text style={styles.serviceValue}>{invoiceData.requestData.notes}</Text>
              </View>
            )}
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.pricingSection}>
            <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
            
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>
                {invoiceData.pricing.bagQuantity} bags × {formatCurrency(invoiceData.pricing.pricePerBag)}
              </Text>
              <Text style={styles.pricingValue}>{formatCurrency(invoiceData.pricing.subtotal)}</Text>
            </View>
            
            {invoiceData.pricing.discount > 0 && (
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, styles.discountLabel]}>
                  {invoiceData.pricing.discountReason}
                </Text>
                <Text style={[styles.pricingValue, styles.discountValue]}>
                  -{formatCurrency(invoiceData.pricing.discount)}
                </Text>
              </View>
            )}
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoiceData.pricing.finalPrice)}</Text>
            </View>
          </View>

          {/* Important Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Important Notes</Text>
            <View style={styles.noteItem}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.noteText}>
                This is a preliminary invoice. Final pricing may vary based on actual waste collected.
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.noteText}>
                Payment is due within 24 hours of service completion.
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
              <Text style={styles.noteText}>
                Admin will review and assign a collector to your request.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.confirmButton, submitting && styles.disabledButton]}
          onPress={handleConfirmRequest}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm & Submit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  invoiceHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'monospace',
  },
  invoiceDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  statusText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  serviceSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  serviceItem: {
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#666',
  },
  pricingValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountLabel: {
    color: '#4CAF50',
  },
  discountValue: {
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notesSection: {
    marginBottom: 16,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});

export default SpecialPickupInvoice;
