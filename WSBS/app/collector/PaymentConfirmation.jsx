import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config';
import { getToken, getUserId } from '../auth';

const PaymentConfirmation = () => {
  const router = useRouter();
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    fetchPendingSubscriptions();
  }, []);

  const fetchPendingSubscriptions = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/billing/pending-cash-subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error fetching pending subscriptions:', error);
      Alert.alert('Error', 'Failed to load pending subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (subscription) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    try {
      setConfirmingPayment(subscription.subscription_id);
      const collectorId = await getUserId();
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/api/billing/confirm-cash-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_id: subscription.subscription_id,
          collector_id: collectorId,
          amount: parseFloat(paymentAmount),
          notes: paymentNotes || `Cash payment collected for ${subscription.plan_name} subscription`
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Payment Confirmed!',
          `Successfully confirmed cash payment of ₱${paymentAmount} for ${subscription.resident_name}'s ${subscription.plan_name} subscription.`,
          [{ text: 'OK', onPress: () => {
            setPaymentAmount('');
            setPaymentNotes('');
            fetchPendingSubscriptions(); // Refresh list
          }}]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', 'Failed to confirm payment. Please try again.');
    } finally {
      setConfirmingPayment(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading pending payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cash Payment Confirmation</Text>
      </View>

      <ScrollView style={styles.content}>
        {pendingSubscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#2e7d32" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No pending cash payments to confirm</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Pending Cash Payments ({pendingSubscriptions.length})
            </Text>
            
            {pendingSubscriptions.map((subscription) => (
              <View key={subscription.subscription_id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <Text style={styles.residentName}>{subscription.resident_name}</Text>
                  <Text style={styles.planName}>{subscription.plan_name}</Text>
                </View>
                
                <View style={styles.subscriptionDetails}>
                  <Text style={styles.detailText}>Amount: ₱{subscription.price}</Text>
                  <Text style={styles.detailText}>Address: {subscription.address}</Text>
                  <Text style={styles.detailText}>Phone: {subscription.contact_number}</Text>
                  <Text style={styles.detailText}>
                    Created: {new Date(subscription.subscription_created_at).toLocaleDateString()}
                  </Text>
                </View>

                {confirmingPayment === subscription.subscription_id && (
                  <View style={styles.paymentForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Payment Amount (₱)"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Notes (optional)"
                      value={paymentNotes}
                      onChangeText={setPaymentNotes}
                      multiline
                    />
                    <View style={styles.formButtons}>
                      <TouchableOpacity 
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => {
                          setConfirmingPayment(null);
                          setPaymentAmount('');
                          setPaymentNotes('');
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.button, styles.confirmButton]}
                        onPress={() => handleConfirmPayment(subscription)}
                      >
                        <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {confirmingPayment !== subscription.subscription_id && (
                  <TouchableOpacity 
                    style={styles.collectButton}
                    onPress={() => {
                      setConfirmingPayment(subscription.subscription_id);
                      setPaymentAmount(subscription.price.toString());
                    }}
                  >
                    <Ionicons name="cash" size={20} color="#fff" />
                    <Text style={styles.collectButtonText}>Confirm Cash Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2e7d32',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  planName: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  subscriptionDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  paymentForm: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    marginRight: 5,
  },
  confirmButton: {
    backgroundColor: '#2e7d32',
    marginLeft: 5,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  collectButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  collectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
});

export default PaymentConfirmation;
