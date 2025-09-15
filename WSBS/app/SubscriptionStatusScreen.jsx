import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { getToken } from './auth';
import { API_BASE_URL } from './config';
import { Platform } from 'react-native';

const SubscriptionStatusScreen = () => {
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduledIds, setScheduledIds] = useState([]);

  // Only import expo-notifications outside Expo Go to avoid SDK 53 warning in Expo Go
  const isExpoGo = Constants?.appOwnership === 'expo';
  const getNotifications = async () => {
    if (!isExpoGo) {
      const mod = await import('expo-notifications');
      return mod;
    }
    // Expo Go shim: provide minimal no-op implementations used in this screen
    return {
      getPermissionsAsync: async () => ({ granted: true }),
      requestPermissionsAsync: async () => ({ granted: true }),
      setNotificationHandler: async () => {},
      setNotificationChannelAsync: async () => {},
      scheduleNotificationAsync: async () => 'shim-id',
      cancelScheduledNotificationAsync: async () => {},
      AndroidImportance: { DEFAULT: 3 },
    };
  };

  const handleCancelSubscription = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login again');
        router.push('/resident/Login');
        return;
      }
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel your subscription? This may stop future collections until you subscribe again.',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes, Cancel', 
            style: 'destructive', 
            onPress: async () => {
              try {
                const res = await fetch(`${API_BASE_URL}/api/billing/cancel-subscription`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ reason: 'User requested cancellation from mobile app' })
                });
                const data = await res.json();
                if (!res.ok || !data?.success) {
                  throw new Error(data?.error || 'Failed to cancel subscription');
                }
                Alert.alert('Cancelled', 'Your subscription has been cancelled. You can reactivate anytime.');
                // Refresh UI
                await fetchSubscriptionStatus();
              } catch (e) {
                Alert.alert('Error', e.message || 'Failed to cancel subscription. Please try again.');
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Unexpected error. Please try again.');
    }
  };
  

  // Helpers: schedule/cancel due notifications
  const cancelDueNotifications = async () => {
    try {
      const Notifications = await getNotifications();
      for (const id of scheduledIds) await Notifications.cancelScheduledNotificationAsync(id);
      setScheduledIds([]);
    } catch (e) {
      console.log('Cancel notifications error', e);
    }
  };

  // Snooze: remind again in 3 days (single local notification)
  const handleSnooze3Days = async () => {
    try {
      const Notifications = await getNotifications();
      const when = new Date(Date.now() + 3*24*60*60*1000);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: 'We will remind you again in 3 days about your subscription payment.',
          data: { screen: 'SubscriptionStatus' },
        },
        trigger: when,
      });
      setScheduledIds((prev) => [...prev, id]);
      Alert.alert('Snoozed', 'We will remind you again in 3 days.');
    } catch (e) {
      console.log('Snooze error', e);
    }
  };

  const scheduleDueNotifications = async (invoice) => {
    try {
      if (!invoice) return;
      const Notifications = await getNotifications();
      const due = new Date(invoice.dueDate || invoice.due_date);
      if (isNaN(due)) return;

      // Clear previous schedules to avoid duplicates
      await cancelDueNotifications();

      const now = new Date();
      const at9am = (d) => { const t = new Date(d); t.setHours(9,0,0,0); return t; };
      const planDates = [
        { when: new Date(due.getTime() - 7*24*60*60*1000), title: 'Payment Reminder', body: 'Your waste collection invoice is due in 7 days.' },
        { when: new Date(due.getTime() - 1*24*60*60*1000), title: 'Payment Reminder', body: 'Your invoice is due tomorrow.' },
        { when: at9am(due), title: 'Invoice Due Today', body: 'Your invoice is due today. Please complete payment.' },
        { when: at9am(new Date(due.getTime() + 3*24*60*60*1000)), title: 'Overdue Notice', body: 'Your invoice is overdue. Service may be impacted.' },
      ];

      const newIds = [];
      for (const p of planDates) {
        if (p.when > now) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: p.title,
              body: p.body,
              data: { screen: 'SubscriptionStatus' },
            },
            trigger: p.when,
          });
          newIds.push(id);
        }
      }
      setScheduledIds(newIds);
    } catch (e) {
      console.log('Schedule notifications error', e);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  // Ask for notification permissions once
  useEffect(() => {
    (async () => {
      try {
        const Notifications = await getNotifications();
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted) {
          await Notifications.requestPermissionsAsync();
        }
        // iOS foreground presentation
        if (Platform.OS === 'ios') {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: false,
              shouldSetBadge: false,
            }),
          });
        }
        // Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
      } catch (e) {
        console.log('Notification permission error', e);
      }
    })();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login again');
        router.push('/resident/Login');
        return;
      }

      // Get user profile first to get user_id
      const profileRes = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!profileRes.ok) {
        Alert.alert('Error', 'Failed to get user profile');
        return;
      }
      
      const profileData = await profileRes.json();
      console.log('🔥 Profile API Response:', JSON.stringify(profileData, null, 2));
      
      // Check different possible response structures
      const userId = profileData.user?.user_id || profileData.user?.id || profileData.id;
      console.log('🔥 Extracted user_id:', userId);
      
      if (!userId) {
        Alert.alert('Error', 'Invalid user data - no user ID found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/billing/subscription-status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('🔥 SubscriptionStatusScreen API Response:', JSON.stringify(data, null, 2));
      console.log('🔥 data.has_subscription value:', data.has_subscription);
      console.log('🔥 Response status:', response.status);
      
      if (data.has_subscription) {
        // Guard: Allow ACTIVE and PENDING states to render here so users can pay
        const incomingUiState = data.uiState || data.subscription?.status;
        const allowedStates = ['active', 'pending_gcash', 'pending_cash'];
        if (incomingUiState && !allowedStates.includes(incomingUiState)) {
          Alert.alert('Access Restricted', 'Your subscription is not active yet. Please complete payment to continue.', [
            { text: 'OK', onPress: () => router.replace('/Subscription') }
          ]);
          return;
        }
        console.log('🔥 Setting subscription data:', data);
        setSubscriptionData(data);
        // Notifications: schedule if unpaid invoice, cancel otherwise
        const inv = data.currentInvoice;
        if (inv && (inv.status || inv.invoice_status || 'unpaid').toString().toLowerCase() !== 'paid') {
          await scheduleDueNotifications(inv);
        } else {
          await cancelDueNotifications();
        }
      } else {
        console.log('🔥 No subscription found or API error:', data.error);
        Alert.alert('Error', data.error || 'Failed to fetch subscription status');
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptionStatus();
  };

  const handleAction = async (action) => {
    switch (action.id) {
      case 'pay_gcash':
        await handleGCashPayment();
        break;
      case 'view_schedule':
        router.push('/CollectionSchedule');
        break;
      case 'payment_history':
        router.push('/PaymentHistory');
        break;
      case 'renew_placeholder':
        // Inform user that renewal isn't due yet
        Alert.alert('Not Due Yet', 'You are not due yet. Please go back and check again closer to your next billing date.');
        break;
      case 'cancel_subscription':
        await handleCancelSubscription();
        break;
      case 'contact_support':
        Linking.openURL('tel:+639123456789');
        break;
      case 'collector_contact':
        Linking.openURL('tel:+639123456789'); // Replace with actual collector number
        break;
      default:
        Alert.alert('Coming Soon', 'This feature will be available soon.');
    }
  };

  const handleGCashPayment = async () => {
    try {
      const token = await getToken();
      const invoice = subscriptionData.currentInvoice;
      
      const response = await fetch(`${API_BASE_URL}/api/billing/create-gcash-source`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: invoice.amount * 100, // Convert to centavos
          description: `Payment for ${invoice.invoiceNumber}`,
          invoice_id: invoice.id,
          subscription_id: subscriptionData.subscription.id
        })
      });

      const paymentData = await response.json();
      
      if (response.ok) {
        Linking.openURL(paymentData.checkout_url);
      } else {
        Alert.alert('Payment Error', paymentData.error || 'Failed to create payment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  const getStatusColor = (uiState) => {
    switch (uiState) {
      case 'active': return '#28a745';
      case 'pending_gcash': return '#ffc107';
      case 'pending_cash': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (uiState) => {
    switch (uiState) {
      case 'active': return 'checkmark-circle';
      case 'pending_gcash': return 'time';
      case 'pending_cash': return 'cash';
      default: return 'help-circle';
    }
  };

  const getStatusText = (uiState) => {
    switch (uiState) {
      case 'active': return 'ACTIVE';
      case 'pending_gcash': return 'PENDING PAYMENT';
      case 'pending_cash': return 'AWAITING COLLECTION';
      default: return 'UNKNOWN';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading subscription status...</Text>
      </View>
    );
  }

  if (!subscriptionData?.has_subscription) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-outline" size={64} color="#ccc" />
        <Text style={styles.noSubscriptionText}>No Active Subscription</Text>
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={() => router.push('/Subscription')}
        >
          <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { subscription } = subscriptionData;
  
  // Transform API data to match expected structure
  const transformedSubscription = (() => {
    // Support two shapes: flat (plan_name/price) and nested (plan: {name, price, frequency})
    const planFromNested = subscription?.plan ? {
      name: subscription.plan.name,
      price: parseFloat(subscription.plan.price),
      frequency: subscription.plan.frequency || 'month',
    } : null;

    const planFromFlat = {
      name: subscription?.plan_name,
      price: parseFloat(subscription?.price),
      frequency: subscription?.frequency || 'month',
    };

    return {
      ...subscription,
      plan: planFromNested || planFromFlat,
      paymentConfirmedAt: subscription?.payment_confirmed_at || subscription?.paymentConfirmedAt,
      payment_method: subscription?.payment_method || subscription?.paymentMethod,
    };
  })();
  
  // Use API-provided objects with sensible fallbacks
  const currentInvoice = subscriptionData.currentInvoice || null;
  const nextCollection = subscriptionData.nextCollection || {
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedTime: '8:00 AM - 10:00 AM'
  };
  const uiState = subscriptionData.uiState || subscription.status; // prefer API-provided uiState
  const baseActions = (subscriptionData.actions && subscriptionData.actions.length
    ? subscriptionData.actions
    : [
        { id: 'view_schedule', label: 'View Collection Schedule', primary: false },
        { id: 'payment_history', label: 'Payment History', primary: false },
        { id: 'contact_support', label: 'Contact Support', primary: false }
      ]
  );
  const actions = uiState === 'active'
    ? [
        ...baseActions,
        { id: 'renew_placeholder', label: 'Renew Subscription', primary: false }
      ]
    : baseActions;

  // Add Cancel Subscription action for both active and pending states (placeholder)
  const actionsWithCancel = [
    ...actions,
    { id: 'cancel_subscription', label: 'Cancel Subscription', primary: false }
  ];

  // Due/Overdue helpers
  const invoiceDueDate = currentInvoice ? new Date(currentInvoice.dueDate || currentInvoice.due_date) : null;
  const now = new Date();
  const isInvoiceUnpaid = currentInvoice && String(currentInvoice.status || currentInvoice.invoice_status || 'unpaid').toLowerCase() !== 'paid';
  const daysUntilDue = invoiceDueDate ? Math.ceil((invoiceDueDate - now) / (24*60*60*1000)) : null;
  const daysOverdue = invoiceDueDate ? Math.ceil((now - invoiceDueDate) / (24*60*60*1000)) : null;
  const isDueSoon = isInvoiceUnpaid && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  const isOverdue = isInvoiceUnpaid && daysOverdue !== null && daysOverdue > 0;
  // Late fee + total due (backend applies flat fee once after grace)
  const invoiceLateFees = currentInvoice ? Number(currentInvoice.lateFees || currentInvoice.late_fees || 0) : 0;
  const baseAmount = currentInvoice ? Number(currentInvoice.amount || 0) : 0;
  const totalDue = baseAmount + (invoiceLateFees || 0);

  // Compute next billing date for active subs when there's no current invoice
  const nextBillingDate = (() => {
    try {
      if (uiState !== 'active' || currentInvoice) return null;
      const base = transformedSubscription.paymentConfirmedAt || transformedSubscription.billingStartDate;
      if (!base) return null;
      const d = new Date(base);
      const freq = (transformedSubscription.plan?.frequency || 'month').toLowerCase();
      if (freq.startsWith('year')) {
        d.setFullYear(d.getFullYear() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    } catch {
      return null;
    }
  })();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trash-bin" size={32} color="#fff" />
        <Text style={styles.headerTitle}>Waste Collection Subscription</Text>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons 
            name={getStatusIcon(uiState)} 
            size={24} 
            color={getStatusColor(uiState)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(uiState) }]}>
            {getStatusText(uiState)}
          </Text>
        </View>
        
        <Text style={styles.planName}>{transformedSubscription.plan.name}</Text>
        <Text style={styles.planPrice}>₱{transformedSubscription.plan.price.toFixed(2)}/{transformedSubscription.plan.frequency}</Text>
        
        {transformedSubscription.paymentConfirmedAt && (
          <Text style={styles.paidDate}>
            ✅ Paid on {new Date(transformedSubscription.paymentConfirmedAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Due/Overdue banner with Snooze */}
      {isInvoiceUnpaid && invoiceDueDate && (
        <View style={[styles.banner, isOverdue ? styles.bannerOverdue : styles.bannerDueSoon]}>
          <Text style={styles.bannerText}>
            {isOverdue
              ? `Invoice overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}.`
              : `Invoice due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`}
          </Text>
          <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze3Days}>
            <Text style={styles.snoozeText}>Remind me in 3 days</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next Billing Date (for active subscriptions without an open invoice) */}
      {uiState === 'active' && nextBillingDate && (
        <View style={styles.invoiceCard}>
          <Text style={styles.cardTitle}>🗓️ Next Billing Date</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Next Charge:</Text>
            <Text style={styles.invoiceValue}>
              {nextBillingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        </View>
      )}

      {/* Next Collection (for active subscriptions) */}
      {uiState === 'active' && nextCollection && (
        <View style={styles.collectionCard}>
          <Text style={styles.cardTitle}>📅 Next Collection</Text>
          <Text style={styles.collectionDate}>
            {new Date(nextCollection.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
          {nextCollection.estimatedTime && (
            <Text style={styles.collectionTime}>🕐 {nextCollection.estimatedTime}</Text>
          )}
        </View>
      )}

      {/* Current Invoice */}
      {currentInvoice && (
        <View style={styles.invoiceCard}>
          <Text style={styles.cardTitle}>📄 Current Invoice</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Invoice:</Text>
            <Text style={styles.invoiceValue}>{currentInvoice.invoiceNumber || currentInvoice.invoice_number}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Amount:</Text>
            <Text style={styles.invoiceValue}>₱{Number(currentInvoice.amount).toFixed(2)}</Text>
          </View>
          {invoiceLateFees > 0 && (
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Late Fee:</Text>
              <Text style={styles.invoiceValue}>₱{invoiceLateFees.toFixed(2)}</Text>
            </View>
          )}
          {invoiceLateFees > 0 && (
            <View style={styles.invoiceRow}>
              <Text style={[styles.invoiceLabel, { fontWeight: 'bold' }]}>Total Due:</Text>
              <Text style={[styles.invoiceValue, { color: '#d35400' }]}>₱{totalDue.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Due Date:</Text>
            <Text style={styles.invoiceValue}>
              {new Date(currentInvoice.dueDate || currentInvoice.due_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Status:</Text>
            <Text style={[
              styles.invoiceValue, 
              { color: (currentInvoice.status || '').toLowerCase() === 'paid' ? '#28a745' : '#dc3545' }
            ]}>
              {currentInvoice.status.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Payment Method Info */}
      <View style={styles.paymentCard}>
        <Text style={styles.cardTitle}>💳 Payment Method</Text>
        <Text style={styles.paymentMethod}>
          {transformedSubscription.payment_method === 'gcash' ? 'GCash' : 'Cash (Pay on Collection)'}
        </Text>
        {transformedSubscription.payment_method === 'cash' && uiState === 'pending_cash' && (
          <Text style={styles.cashInstructions}>
            💵 Pay the collector during waste pickup
          </Text>
        )}
      </View>

      {/* Due/Overdue banner with Snooze */}
      {isInvoiceUnpaid && invoiceDueDate && (
        <View style={[styles.banner, isOverdue ? styles.bannerOverdue : styles.bannerDueSoon]}>
          <Text style={styles.bannerText}>
            {isOverdue
              ? `Invoice overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}.`
              : `Invoice due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`}
          </Text>
          <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze3Days}>
            <Text style={styles.snoozeText}>Remind me in 3 days</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {actionsWithCancel.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.actionButton, a.primary && styles.primaryActionButton]}
            onPress={() => handleAction(a)}
          >
            <Text style={[styles.actionButtonText, a.primary && styles.primaryActionButtonText]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Banners (due/overdue)
  banner: {
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerDueSoon: {
    backgroundColor: '#FFF8E1', // light amber
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  bannerOverdue: {
    backgroundColor: '#FFEBEE', // light red
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  bannerText: {
    color: '#333',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  snoozeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  snoozeText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  paidDate: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 10,
  },
  collectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  collectionDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  collectionTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cashInstructions: {
    fontSize: 14,
    color: '#17a2b8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionsContainer: {
    padding: 15,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryActionButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  actionButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  primaryActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noSubscriptionText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  subscribeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SubscriptionStatusScreen;
