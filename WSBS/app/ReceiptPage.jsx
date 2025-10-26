import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getToken, getUserId } from './auth';
import { API_BASE_URL } from './config';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ReceiptPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef();

  useEffect(() => {
    fetchReceiptData();
  }, []);

  const fetchReceiptData = async () => {
    try {
      const token = await getToken();
      const userId = await getUserId();
      
      if (!token || !userId) {
        Alert.alert('Error', 'Please login again');
        router.replace('/resident/Login');
        return;
      }

      // Get user's latest receipt
      const response = await fetch(`${API_BASE_URL}/api/receipt/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.receipts && data.receipts.length > 0) {
          setReceiptData(data.receipts[0]); // Get latest receipt
        } else {
          Alert.alert('No Receipt', 'No payment receipt found.');
          router.back();
        }
      } else {
        Alert.alert('Error', 'Failed to fetch receipt.');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      Alert.alert('Error', 'Failed to load receipt.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadReceipt = async () => {
    try {
      setDownloading(true);
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your device.');
        return;
      }

      // Capture the receipt as image
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      // Generate filename with receipt number and date
      const receiptNumber = receiptData.receipt_number || 'receipt';
      const date = new Date().toISOString().split('T')[0];
      const filename = `WSBS_Receipt_${receiptNumber}_${date}.png`;

      // Save to device
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('WSBS Receipts', asset, false);
      
      Alert.alert(
        'Receipt Downloaded!', 
        `Receipt saved to your Photos as ${filename}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Unable to save receipt. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading Receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!receiptData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>No Receipt Available</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const receiptDetails = receiptData.receipt_data ? JSON.parse(receiptData.receipt_data) : {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.replace('/resident/HomePage')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Receipt</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Receipt Card */}
        <View ref={receiptRef} style={styles.receiptCard}>
          {/* Company Header */}
          <View style={styles.companyHeader}>
            <Ionicons name="trash-bin" size={32} color="#0066CC" />
            <Text style={styles.companyName}>WSBS - Waste Management Service</Text>
            <Text style={styles.companySubtitle}>Official Payment Receipt</Text>
          </View>

          {/* Receipt Number */}
          <View style={styles.receiptNumberSection}>
            <Text style={styles.receiptNumberLabel}>Receipt #</Text>
            <Text style={styles.receiptNumber}>{receiptData.receipt_number}</Text>
          </View>

          {/* Payment Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(receiptData.payment_date)} at {formatTime(receiptData.payment_date)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValueAmount}>₱{parseFloat(receiptData.amount).toFixed(2)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>{receiptData.payment_method}</Text>
            </View>

            {receiptDetails.reference_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference:</Text>
                <Text style={styles.detailValue}>{receiptDetails.reference_number}</Text>
              </View>
            )}

            {receiptDetails.collector_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Collected by:</Text>
                <Text style={styles.detailValue}>Collector #{receiptDetails.collector_id}</Text>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.statusSection}>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#28A745" />
              <Text style={styles.statusText}>PAID</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.receiptFooter}>
            <Text style={styles.footerText}>Thank you for your payment!</Text>
            <Text style={styles.footerSubtext}>
              Your subscription is now active and waste collection services will continue as scheduled.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={downloadReceipt}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#28A745" />
            ) : (
              <Ionicons name="download" size={20} color="#28A745" />
            )}
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Downloading...' : 'Download Receipt'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.replace('/resident/HomePage')}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.replace('/SubscriptionStatusScreen')}
          >
            <Ionicons name="document-text" size={20} color="#0066CC" />
            <Text style={styles.secondaryButtonText}>View Subscription</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  companyHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  companySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  receiptNumberSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  receiptNumberLabel: {
    fontSize: 14,
    color: '#666',
  },
  receiptNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  detailValueAmount: {
    fontSize: 18,
    color: '#28A745',
    fontWeight: 'bold',
    flex: 2,
    textAlign: 'right',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28A745',
    marginLeft: 8,
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0066CC',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#28A745',
    gap: 8,
    marginBottom: 8,
  },
  downloadButtonText: {
    color: '#28A745',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReceiptPage;
