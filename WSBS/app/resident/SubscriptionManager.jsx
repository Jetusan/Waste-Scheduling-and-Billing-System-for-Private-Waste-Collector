import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken, getUserId } from '../auth';
import { API_BASE_URL } from '../config';

const SubscriptionManager = () => {
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      const userId = await getUserId();
      
      if (!token || !userId) {
        setError('Authentication required');
        return;
      }

      // Fetch subscription info
      const subResponse = await fetch(`${API_BASE_URL}/api/billing/subscription/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      // Fetch invoices
      const invoiceResponse = await fetch(`${API_BASE_URL}/api/billing/invoices/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json();
        setInvoices(invoiceData.invoices || []);
      }

    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'pending_payment': return '#FF9500';
      case 'suspended': return '#F44336';
      case 'cancelled': return '#757575';
      case 'paid': return '#4CAF50';
      case 'unpaid': return '#F44336';
      case 'overdue': return '#FF5722';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'pending_payment': return 'time';
      case 'suspended': return 'pause-circle';
      case 'cancelled': return 'close-circle';
      case 'paid': return 'checkmark-circle';
      case 'unpaid': return 'close-circle';
      case 'overdue': return 'warning';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  const renderSubscriptionCard = () => {
    if (!subscription) {
      return (
        <View style={styles.noSubscriptionCard}>
          <MaterialIcons name="inbox" size={64} color="#ccc" />
          <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
          <Text style={styles.noSubscriptionText}>
            You don't have an active subscription yet. Subscribe now to start waste collection service.
          </Text>
          <TouchableOpacity 
            style={styles.subscribeButton}
            onPress={() => router.push('/subscription')}
          >
            <MaterialIcons name="add-circle" size={20} color="#fff" />
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionHeader}>
          <Text style={styles.subscriptionTitle}>Current Subscription</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
            <Ionicons name={getStatusIcon(subscription.status)} size={16} color="#fff" />
            <Text style={styles.statusText}>{subscription.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.subscriptionDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="local-offer" size={20} color="#666" />
            <Text style={styles.detailLabel}>Plan:</Text>
            <Text style={styles.detailValue}>{subscription.plan_name}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color="#666" />
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>{formatCurrency(subscription.price)}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={20} color="#666" />
            <Text style={styles.detailLabel}>Frequency:</Text>
            <Text style={styles.detailValue}>{subscription.frequency}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="payment" size={20} color="#666" />
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>{subscription.payment_method}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="date-range" size={20} color="#666" />
            <Text style={styles.detailLabel}>Started:</Text>
            <Text style={styles.detailValue}>{formatDate(subscription.created_at)}</Text>
          </View>
        </View>

        <View style={styles.subscriptionActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Alert.alert('Manage Subscription', 'Subscription management options can be implemented here');
            }}
          >
            <MaterialIcons name="settings" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Manage</Text>
          </TouchableOpacity>

          {subscription.status === 'pending_payment' && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => router.push('/payment')}
            >
              <MaterialIcons name="payment" size={20} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderInvoiceCard = (invoice) => (
    <View key={invoice.invoice_id} style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>Invoice #{invoice.invoice_id}</Text>
          <Text style={styles.invoiceDate}>{formatDate(invoice.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
          <Ionicons name={getStatusIcon(invoice.status)} size={14} color="#fff" />
          <Text style={styles.statusText}>{invoice.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.invoiceDetails}>
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Amount:</Text>
          <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
        </View>

        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Due Date:</Text>
          <Text style={styles.invoiceValue}>{formatDate(invoice.due_date)}</Text>
        </View>

        {invoice.paid_at && (
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Paid:</Text>
            <Text style={styles.invoiceValue}>{formatDate(invoice.paid_at)}</Text>
          </View>
        )}
      </View>

      {invoice.status === 'unpaid' && (
        <TouchableOpacity 
          style={styles.payButton}
          onPress={() => {
            Alert.alert('Pay Invoice', `Pay invoice #${invoice.invoice_id} for ${formatCurrency(invoice.amount)}?`);
          }}
        >
          <MaterialIcons name="payment" size={20} color="#fff" />
          <Text style={styles.payButtonText}>Pay {formatCurrency(invoice.amount)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Subscription</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading subscription data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Subscription</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Action Buttons */}
        {!subscription && (
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/subscription')}
            >
              <MaterialIcons name="add-circle" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Subscribe to Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Section */}
        <View style={styles.section}>
          {renderSubscriptionCard()}
        </View>

        {/* Invoices Section */}
        {invoices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing History</Text>
            {invoices.map(renderInvoiceCard)}
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={48} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSubscriptionData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  actionSection: {
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noSubscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noSubscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noSubscriptionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  subscriptionDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  subscriptionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8f0',
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#666',
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
  },
  invoiceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  invoiceAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SubscriptionManager;
