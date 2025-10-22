import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from './auth';
import { API_BASE_URL } from './config';

export default function PaymentHistory() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError('Please login again');
        return;
      }

      // 1) Get user id from profile
      const profileRes = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) {
        throw new Error(`Failed to load profile: ${profileRes.status}`);
      }
      const profile = await profileRes.json();
      const userId = profile?.user?.user_id ?? profile?.user?.id ?? profile?.user?.userId;
      if (!userId) {
        throw new Error('No user ID found in profile');
      }

      console.log('📋 Fetching payment history for user:', userId);

      // 2) Get subscription status (contains paymentHistory)
      const subRes = await fetch(`${API_BASE_URL}/api/billing/subscription-status/${userId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!subRes.ok) {
        throw new Error(`Failed to load subscription: ${subRes.status}`);
      }
      
      const subData = await subRes.json();
      console.log('📋 Subscription data received:', subData);
      
      // Handle both response formats
      let paymentHistory = [];
      
      if (subData?.paymentHistory) {
        // New format from subscriptionStatusController
        paymentHistory = subData.paymentHistory;
      } else if (subData?.has_subscription) {
        // Old format from billingController - no payment history included
        console.log('📋 Old format detected, no payment history available');
        paymentHistory = [];
      } else {
        console.log('📋 No subscription found');
        paymentHistory = [];
      }
      
      console.log('📋 Payment history items:', paymentHistory.length);
      setPayments(paymentHistory);
      
    } catch (err) {
      console.error('📋 Payment history error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Ionicons name="card-outline" size={22} color="#fff" />
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#4CD964" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : payments.length === 0 ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Ionicons name="receipt-outline" size={48} color="#ccc" style={{ marginBottom: 10 }} />
          <Text style={styles.empty}>No payment history found.</Text>
          <Text style={[styles.empty, { fontSize: 12, marginTop: 5 }]}>Payments will appear here after you make them.</Text>
        </View>
      ) : (
        <View style={{ padding: 16 }}>
          {payments.map((p) => (
            <View key={p.id || p.payment_id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.invoiceNo}>Invoice {p.invoiceNumber || p.invoice_number || '—'}</Text>
                <Text style={styles.amount}>₱{Number(p.amount).toFixed(2)}</Text>
              </View>
              <Text style={styles.meta}>Method: {(p.method || p.payment_method || '').toUpperCase()}</Text>
              <Text style={styles.meta}>Date: {p.date ? new Date(p.date).toLocaleString() : (p.payment_date ? new Date(p.payment_date).toLocaleString() : '—')}</Text>
              {p.referenceNumber || p.reference_number ? (
                <Text style={styles.meta}>Ref: {p.referenceNumber || p.reference_number}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#4CD964', padding: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNo: { fontSize: 15, fontWeight: '700', color: '#333' },
  amount: { fontSize: 15, fontWeight: '700', color: '#333' },
  meta: { marginTop: 4, color: '#666', fontSize: 13 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20 },
});
