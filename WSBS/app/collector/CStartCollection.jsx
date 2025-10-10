import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getUserId, getToken, getCollectorId } from '../auth';
import * as Location from 'expo-location';
import EnhancedMissedCollectionModal from './components/EnhancedMissedCollectionModal';

// Fallback sample list shown only if we don't yet have real stops
const sampleBarangays = [
  'Brgy. San Isidro, General Santos City',
  'Brgy. Mabuhay, General Santos City',
  'Brgy. City Heights, General Santos City',
];

const CStartCollection = () => {
  const router = useRouter();

  // Assignment + stops state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [stops, setStops] = useState([]);
  const [schedLoading, setSchedLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [myBarangay, setMyBarangay] = useState(null);
  const [residentLocations, setResidentLocations] = useState([]);
  const [selectedResidentLocation, setSelectedResidentLocation] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [collectorLocation, setCollectorLocation] = useState(null);
  // Cache resolved collector_id (not users.user_id)
  const [collectorId, setCollectorId] = useState(null);
  // Payment method + cash-collection state
  const [paymentInfo, setPaymentInfo] = useState({}); // { [user_id]: { payment_method, subscription_id, plan_name, price } }
  const [amountInputs, setAmountInputs] = useState({}); // { [user_id]: string }
  const [confirmingUserId, setConfirmingUserId] = useState(null);
  const [submittingStopId, setSubmittingStopId] = useState(null);
  // Catch-ups (auto-rescheduled tasks)
  const [catchups, setCatchups] = useState([]);
  const [catchupsLoading, setCatchupsLoading] = useState(false);
  // Route issue reporting
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueReported, setIssueReported] = useState(null);
  const [issueChooserOpen, setIssueChooserOpen] = useState(false);
  const [actionChooserOpen, setActionChooserOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null); // { type, severity }
  // Enhanced missed collection modal
  const [enhancedMissedModalVisible, setEnhancedMissedModalVisible] = useState(false);
  const [selectedStopForMissed, setSelectedStopForMissed] = useState(null);

  const handleMapReady = useCallback((ref) => {
    setMapRef(ref);
  }, [resolveCollectorId]);

  // Safely send messages to the WebView by injecting a script that dispatches a MessageEvent
  const sendToMap = useCallback((obj) => {
    if (!mapRef || !obj) return;
    try {
      const payload = JSON.stringify(obj)
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\u2028|\u2029/g, '');
      const js = `(() => { try { var ev = new MessageEvent('message', { data: '${payload}' }); window.dispatchEvent(ev); document.dispatchEvent(ev); } catch(e){} })();`;
      if (typeof mapRef.injectJavaScript === 'function') {
        mapRef.injectJavaScript(js);
      } else if (typeof mapRef.postMessage === 'function') {
        // Fallback to postMessage if supported by this RN WebView version
        mapRef.postMessage(payload);
      }
    } catch (_) { /* noop */ }
  }, [mapRef]);

  // Fetch today's catch-ups for this collector
  const fetchCatchups = useCallback(async () => {
    try {
      const token = await getToken();
      const collectorId = await resolveCollectorId();
      if (!token || !collectorId) return;
      setCatchupsLoading(true);
      const url = `${API_BASE_URL}/api/collector/assignments/catchups/today?collector_id=${encodeURIComponent(collectorId)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && Array.isArray(data.stops)) {
        setCatchups(data.stops);
      } else {
        setCatchups([]);
      }
    } catch {
      setCatchups([]);
    } finally {
      setCatchupsLoading(false);
    }
  }, [resolveCollectorId]);

  useEffect(() => {
    fetchCatchups();
  }, [fetchCatchups]);

  const handleCatchupCollected = useCallback(async (task) => {
    try {
      const token = await getToken();
      const collectorId = await resolveCollectorId();
      if (!token || !collectorId) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }
      setSubmittingStopId(task.stop_id || `catchup-${task.task_id}`);
      const res = await fetch(`${API_BASE_URL}/api/collector/assignments/catchups/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.task_id,
          user_id: task.user_id,
          collector_id: collectorId,
          notes: `Catch-up collected at ${new Date().toISOString()}`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        Alert.alert('Catch-up Collected', `${task.resident_name || 'Resident'} completed.`);
        // Remove from local catchups
        setCatchups(prev => prev.filter(s => s.task_id !== task.task_id));
      } else {
        Alert.alert('Error', data?.message || 'Failed to complete catch-up.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to complete catch-up.');
    } finally {
      setSubmittingStopId(null);
    }
  }, [resolveCollectorId]);

  // Resolve collectors.collector_id from saved users.user_id, preferring stored collector_id from auth
  const resolveCollectorId = useCallback(async () => {
    try {
      if (collectorId) return collectorId;
      // Prefer stored collector_id from auth
      try {
        const stored = await getCollectorId?.();
        if (stored) {
          setCollectorId(stored);
          return stored;
        }
      } catch (_) {}
      const userId = await getUserId();
      if (!userId) return null;
      // Try to fetch collectors and map by user_id
      const res = await fetch(`${API_BASE_URL}/api/collectors`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const byUser = list.filter(c => Number(c.user_id) === Number(userId));
          if (byUser.length > 0) {
            byUser.sort((a, b) => Number(b.collector_id) - Number(a.collector_id));
            const latest = byUser[0];
            if (latest && latest.collector_id) {
              setCollectorId(latest.collector_id);
              return latest.collector_id;
            }
          }
        }
      }
      // Fallback: use user_id as collectorId with warning (may return no stops)
      console.warn('[assignments] Failed to map user_id to collector_id. Falling back to user_id:', userId);
      setCollectorId(userId);
      return userId;
    } catch (e) {
      console.warn('[assignments] resolveCollectorId error:', e?.message || e);
      return null;
    }
  }, [collectorId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cid = await resolveCollectorId();
        console.log('Resolved collector_id:', cid);
        if (!cid) throw new Error('Missing collector id');

        // Try to fetch today's active assignment for this collector.
        // Backend endpoint is suggested; if not present, this will fail and we show the fallback UI.
        const url = `${API_BASE_URL}/api/collector/assignments/today?collector_id=${encodeURIComponent(cid)}`;
        console.log('Making API call to:', url);
        const res = await fetch(url);
        console.log('API response status:', res.status, res.statusText);
        if (!res.ok) {
          // 404/500 -> treat as no assignment
          setAssignment(null);
          setStops([]);
        } else {
          const data = await res.json();
          console.log('Assignment API response:', data);
          
          // Handle API response: { assignment: {...}, stops: [...] }
          if (data && data.assignment) {
            console.log('Found assignment:', data.assignment);
            console.log('Found stops:', data.stops);
            setAssignment(data.assignment);
            setStops(Array.isArray(data.stops) ? data.stops : []);
          } else if (data && data.assignment_id) {
            // Fallback for different response format
            console.log('Found assignment (alt format):', data);
            setAssignment(data);
            setStops(Array.isArray(data.stops) ? data.stops : []);
          } else if (Array.isArray(data) && data.length > 0) {
            // If API returns an array of assignments, pick the first active
            console.log('Using first assignment from array:', data[0]);
            setAssignment(data[0]);
            setStops([]);
          } else {
            console.log('No assignment data found');
            setAssignment(null);
            setStops([]);
          }
        }
      } catch (e) {
        setAssignment(null);
        setStops([]);
        setError(e?.message || 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchResidentLocations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      // Extract user_ids from stops
      const userIds = stops.map(stop => stop.user_id).filter(id => id);
      
      if (userIds.length === 0) {
        // Fallback: Add test user_id 140 for debugging
        userIds.push(140);
      }
      
      const url = `${API_BASE_URL}/api/residents/locations?user_ids=${userIds.join(',')}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.locations) {
          setResidentLocations(data.locations);
        }
      }
    } catch (e) {
      // Silent error handling
    }
  }, [stops]);

  // Fetch resident locations when stops are loaded OR when component mounts (for test data)
  useEffect(() => {
    if (stops && stops.length > 0) {
      fetchResidentLocations();
    } else {
      // Even if no stops, fetch locations for test user_id 140
      fetchResidentLocations();
    }
  }, [stops, fetchResidentLocations]);

  // Push resident markers to the WebView map whenever locations change
  useEffect(() => {
    try {
      if (!mapRef) return;
      if (!residentLocations || residentLocations.length === 0) return;
      const markers = residentLocations
        .map(loc => ({
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          name: loc.name || '',
          address: loc.address || '',
          user_id: loc.user_id,
        }))
        .filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude));
      if (markers.length === 0) return;
      sendToMap({ type: 'set_resident_markers', markers });
    } catch (e) {
      // no-op
    }
  }, [mapRef, residentLocations]);

  // Request and send collector current location to map (best-effort)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isMounted) return;
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCollectorLocation(loc);
        if (mapRef && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
          sendToMap({ type: 'set_collector_location', location: loc });
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { isMounted = false; };
  }, [mapRef]);

  // Fetch payment methods for current stops
  useEffect(() => {
    (async () => {
      try {
        if (!stops || stops.length === 0) return;
        const token = await getToken();
        if (!token) return;
        const userIds = stops.map(s => s.user_id).filter(Boolean);
        if (userIds.length === 0) return;
        const url = `${API_BASE_URL}/api/billing/subscriptions/payment-methods?user_ids=${userIds.join(',')}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          const map = {};
          data.data.forEach(row => {
            if (!row || !row.user_id) return;
            map[row.user_id] = {
              payment_method: row.payment_method,
              subscription_id: row.subscription_id,
              plan_name: row.plan_name,
              price: typeof row.price === 'number' ? row.price : (row.price ? parseFloat(row.price) : null),
              frequency: row.frequency,
              status: row.status,
              payment_status: row.payment_status
            };
          });
          setPaymentInfo(map);
        }
      } catch (e) {
        // Silent fail; UI just won't show payment badges
      }
    })();
  }, [stops]);

  const handleConfirmCash = useCallback(async (stop) => {
    try {
      const info = paymentInfo[stop.user_id];
      if (!info || info.payment_method !== 'cash') {
        Alert.alert('Not Cash', 'This subscriber is not set to Cash on Collection.');
        return;
      }
      const amountStr = amountInputs[stop.user_id];
      const amountNum = parseFloat(amountStr || `${info.price || ''}`);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid cash amount.');
        return;
      }
      const collectorId = await resolveCollectorId();
      const token = await getToken();
      if (!collectorId || !token) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }
      setConfirmingUserId(stop.user_id);
      
      const res = await fetch(`${API_BASE_URL}/api/billing/confirm-cash-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: info.subscription_id,
          collector_id: collectorId,
          amount: amountNum,
          notes: `Cash collected by collector at stop ${stop.stop_id || ''}`
        })
      });
      const data = await res.json();
      if (data && data.success) {
        // Record the collection event with amount
        await fetch(`${API_BASE_URL}/api/collector/assignments/stop/collected`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stop_id: stop.stop_id,
            schedule_id: stop.schedule_id,
            user_id: stop.user_id,
            collector_id: collectorId,
            amount: amountNum,
            notes: `Cash payment collected: ₱${amountNum.toFixed(2)} at ${new Date().toISOString()}`
          })
        });
        
        Alert.alert('Cash Confirmed', `₱${amountNum.toFixed(2)} recorded for ${stop.resident_name || 'resident'}. Subscription activated!`);
        
        // Clear amount input
        setAmountInputs(prev => ({ ...prev, [stop.user_id]: '' }));
        
        // Mark stop as collected locally (will disappear from list)
        setStops(prev => prev.map(s => 
          s.user_id === stop.user_id 
            ? { ...s, latest_action: 'collected', latest_updated_at: new Date().toISOString() }
            : s
        ));
        
        // Refresh payment info to show updated status
        setTimeout(() => {
          setPaymentInfo(prev => ({ ...prev }));
        }, 1000);
      } else {
        Alert.alert('Error', data?.error || 'Failed to confirm cash payment.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to confirm cash payment.');
    } finally {
      setConfirmingUserId(null);
    }
  }, [paymentInfo, amountInputs, resolveCollectorId]);

  const handlePaymentFailed = useCallback(async (stop, outcome) => {
    try {
      const info = paymentInfo[stop.user_id];
      if (!info || info.payment_method !== 'cash') {
        return;
      }
      
      const collectorId = await resolveCollectorId();
      const token = await getToken();
      if (!collectorId || !token) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }
      
      // Calculate retry date (next day)
      const retryDate = new Date();
      retryDate.setDate(retryDate.getDate() + 1);
      
      // Record payment failure
      const res = await fetch(`${API_BASE_URL}/api/billing/payment-attempt`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: info.subscription_id,
          collector_id: collectorId,
          outcome: outcome,
          notes: `Payment attempt failed at stop ${stop.stop_id || ''}: ${outcome}`,
          retry_scheduled_date: retryDate.toISOString().split('T')[0]
        })
      });
      
      const data = await res.json();
      if (data && data.success) {
        const attemptCount = data.subscription_status?.payment_attempts_count || 0;
        const score = data.subscription_status?.payment_score || 100;
        
        // Automatically mark as missed since payment failed
        await submitMissedWithReason(stop, 'resident_fault');
        
        let message = `Payment failed: ${outcome.replace(/_/g, ' ')}\nCollection marked as missed.\nRetry scheduled for tomorrow.`;
        if (attemptCount >= 2) {
          message += `\n\n⚠️ Warning: ${attemptCount} failed attempts. Subscription may be suspended after 3 attempts.`;
        }
        if (score < 70) {
          message += `\n\n📊 Payment score: ${score}/100`;
        }
        
        Alert.alert('Payment Failed', message);
        
        // Remove stop from local list (it will disappear)
        setStops(prev => prev.map(s => 
          s.user_id === stop.user_id ? { ...s, latest_action: 'missed' } : s
        ));
      }
    } catch (e) {
      console.error('Failed to record payment attempt:', e);
      Alert.alert('Error', 'Failed to record payment failure. Please try again.');
    }
  }, [paymentInfo, resolveCollectorId, submitMissedWithReason]);

  const showPaymentFailedOptions = useCallback((stop) => {
    Alert.alert(
      'Payment Collection Failed',
      'Why couldn\'t you collect the payment?',
      [
        { 
          text: 'Resident Not Home', 
          onPress: () => handlePaymentFailed(stop, 'not_home')
        },
        { 
          text: 'Resident Has No Cash', 
          onPress: () => handlePaymentFailed(stop, 'no_cash')
        },
        { 
          text: 'Resident Refused to Pay', 
          onPress: () => handlePaymentFailed(stop, 'refused'),
          style: 'destructive'
        },
        { 
          text: 'Promised to Pay Next Time', 
          onPress: () => handlePaymentFailed(stop, 'promised_next_time')
        },
        { 
          text: 'Cancel', 
          style: 'cancel'
        }
      ]
    );
  }, [handlePaymentFailed]);

  const handleCollected = useCallback(async (stop) => {
    try {
      const token = await getToken();
      const collectorId = await resolveCollectorId();
      if (!token || !collectorId) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }
      setSubmittingStopId(stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`);
      const res = await fetch(`${API_BASE_URL}/api/collector/assignments/stop/collected`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_id: stop.stop_id,
          schedule_id: stop.schedule_id,
          user_id: stop.user_id,
          collector_id: collectorId,
          notes: `Collected at ${new Date().toISOString()}`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        Alert.alert('Marked Collected', `${stop.resident_name || 'Resident'} has been marked as collected.`);
        // Optimistically update local stop status
        setStops(prev => prev.map(s => (
          (s.user_id === stop.user_id && (s.schedule_id === stop.schedule_id))
            ? { ...s, latest_action: 'collected', latest_updated_at: new Date().toISOString() }
            : s
        )));
      } else {
        Alert.alert('Error', data?.message || 'Failed to mark as collected.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to mark as collected.');
    } finally {
      setSubmittingStopId(null);
    }
  }, []);

  const submitMissedWithReason = useCallback(async (stop, missed_reason) => {
    try {
      const token = await getToken();
      const collectorId = await resolveCollectorId();
      if (!token || !collectorId) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }
      setSubmittingStopId(stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`);
      const res = await fetch(`${API_BASE_URL}/api/collector/assignments/stop/missed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_id: stop.stop_id,
          schedule_id: stop.schedule_id,
          user_id: stop.user_id,
          collector_id: collectorId,
          notes: `Missed at ${new Date().toISOString()}`,
          missed_reason
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        const tentative = data?.next_catchup_date;
        const msg = missed_reason === 'collector_fault'
          ? (tentative
              ? `Marked missed. Tentative catch-up: ${tentative} (subject to change).`
              : 'Marked missed. Catch-up will be scheduled and you will be notified.')
          : 'Marked missed. Will roll over to next regular schedule.';
        Alert.alert('Marked Missed', msg);
        // Optimistically update local stop status
        setStops(prev => prev.map(s => (
          (s.user_id === stop.user_id && (s.schedule_id === stop.schedule_id))
            ? { ...s, latest_action: 'missed', latest_updated_at: new Date().toISOString() }
            : s
        )));
      } else {
        Alert.alert('Error', data?.message || 'Failed to mark as missed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to mark as missed.');
    } finally {
      setSubmittingStopId(null);
    }
  }, []);

  const handleMissed = useCallback((stop) => {
    // Use enhanced modal instead of basic alert
    setSelectedStopForMissed(stop);
    setEnhancedMissedModalVisible(true);
  }, []);

  const showCollectorFaultOptions = useCallback((stop) => {
    try {
      Alert.alert(
        'Collector Issue Details',
        'What specific issue occurred?',
        [
          { text: 'Truck breakdown', onPress: () => submitMissedWithDetails(stop, 'collector_fault', 'truck_breakdown', 3) },
          { text: 'Equipment malfunction', onPress: () => submitMissedWithDetails(stop, 'collector_fault', 'equipment_failure', 1) },
          { text: 'Route blocked/inaccessible', onPress: () => submitMissedWithDetails(stop, 'collector_fault', 'route_blocked', 2) },
          { text: 'Collector sick/emergency', onPress: () => submitMissedWithDetails(stop, 'collector_fault', 'collector_emergency', 1) },
          { text: 'Other operational issue', onPress: () => submitMissedWithDetails(stop, 'collector_fault', 'other_operational', 1) },
          { text: 'Back', onPress: () => handleMissed(stop) }
        ]
      );
    } catch (_) {
      // Fallback: default collector fault with 1 day
      submitMissedWithDetails(stop, 'collector_fault', 'other_operational', 1);
    }
  }, []);

  const submitMissedWithDetails = useCallback(async (stop, missed_reason, fault_detail, estimated_delay_days) => {
    try {
      const token = await getToken();
      const collectorId = await resolveCollectorId();
      if (!token || !collectorId) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }
      setSubmittingStopId(stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`);
      const res = await fetch(`${API_BASE_URL}/api/collector/assignments/stop/missed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_id: stop.stop_id,
          schedule_id: stop.schedule_id,
          user_id: stop.user_id,
          collector_id: collectorId,
          notes: `Missed at ${new Date().toISOString()}`,
          missed_reason,
          fault_detail,
          estimated_delay_days
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        const tentative = data?.next_catchup_date;
        let msg;
        if (missed_reason === 'collector_fault') {
          if (fault_detail === 'truck_breakdown') {
            msg = tentative
              ? `Marked missed due to truck breakdown. Estimated repair: ${estimated_delay_days} days. Tentative catch-up: ${tentative}.`
              : 'Marked missed due to truck breakdown. Admin will schedule catch-up and notify you.';
          } else if (fault_detail === 'equipment_failure') {
            msg = tentative
              ? `Marked missed due to equipment failure. Catch-up scheduled: ${tentative}.`
              : 'Marked missed due to equipment failure. Catch-up will be scheduled.';
          } else if (fault_detail === 'route_blocked') {
            msg = tentative
              ? `Marked missed due to blocked route. Estimated resolution: ${estimated_delay_days} days. Tentative catch-up: ${tentative}.`
              : 'Marked missed due to blocked route. Admin will reschedule when accessible.';
          } else if (fault_detail === 'collector_emergency') {
            msg = tentative
              ? `Marked missed due to emergency. Catch-up scheduled: ${tentative}.`
              : 'Marked missed due to emergency. Catch-up will be scheduled.';
          } else {
            msg = tentative
              ? `Marked missed due to operational issue. Catch-up scheduled: ${tentative}.`
              : 'Marked missed due to operational issue. Admin will schedule catch-up.';
          }
        } else {
          msg = 'Marked missed. Will roll over to next regular schedule.';
        }
        Alert.alert('Marked Missed', msg);
        // Optimistically update local stop status
        setStops(prev => prev.map(s => (
          (s.user_id === stop.user_id && (s.schedule_id === stop.schedule_id))
            ? { ...s, latest_action: 'missed', latest_updated_at: new Date().toISOString() }
            : s
        )));
      } else {
        Alert.alert('Error', data?.message || 'Failed to mark as missed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to mark as missed.');
    } finally {
      setSubmittingStopId(null);
    }
  }, []);

  // Route issue reporting functions
  const handleRouteIssue = useCallback(() => {
    // Use a custom modal to support more than 3 options on Android
    setIssueChooserOpen(true);
  }, []);

  const chooseIssue = useCallback((type, severity) => {
    setSelectedIssue({ type, severity });
    setIssueChooserOpen(false);
    setActionChooserOpen(true);
  }, []);

  const reportIssue = useCallback(async (issueType, severity) => {
    try {
      const collectorId = await resolveCollectorId();
      const token = await getToken();
      if (!collectorId || !token) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }

      // Get affected schedule IDs from current assignment
      const affectedScheduleIds = assignment ? [assignment.schedule_id] : [];

      // Prompt for requested action based on issue type
      const actionOptions = getActionOptions(issueType, severity);
      
      // Open action chooser modal with dynamic options
      setSelectedIssue({ type: issueType, severity });
      // Keep token and collector context by closing over them
      setIssueChooserOpen(false);
      // Stash these so we can submit on selection
      setActionChooserOpen(true);
      // Temporarily store them on component instance via refs is overkill; we'll reuse submit handler below
      // and read from selectedIssue plus recompute actionOptions when rendering.
    } catch (error) {
      Alert.alert('Error', 'Failed to report issue. Please try again.');
    }
  }, [assignment, resolveCollectorId]);

  const getActionOptions = (issueType, severity) => {
    const baseOptions = [
      { label: 'Request backup truck', value: 'backup_truck' },
      { label: 'Delay route (2 hours)', value: 'delay_2h' },
      { label: 'Delay route (4 hours)', value: 'delay_4h' },
      { label: 'Reschedule to tomorrow', value: 'reschedule_tomorrow' }
    ];

    if (severity === 'critical' || issueType === 'truck_breakdown') {
      baseOptions.push({ label: 'Cancel route', value: 'cancel_route' });
    }

    return baseOptions;
  };

  const submitIssueReport = useCallback(async (collectorId, token, issueType, severity, requestedAction, affectedScheduleIds) => {
    try {
      setReportingIssue(true);
      
      const response = await fetch(`${API_BASE_URL}/api/collector/issues/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collector_id: collectorId,
          issue_type: issueType,
          severity: severity,
          description: `${issueType.replace('_', ' ')} reported via mobile app`,
          affected_schedule_ids: affectedScheduleIds,
          requested_action: requestedAction,
          estimated_delay_hours: requestedAction.includes('delay_2h') ? 2 : requestedAction.includes('delay_4h') ? 4 : null,
          location_lat: collectorLocation?.latitude || null,
          location_lng: collectorLocation?.longitude || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIssueReported({
          issue_id: data.issue_id,
          auto_approved: data.auto_approved,
          message: data.message
        });
        
        Alert.alert(
          data.auto_approved ? 'Issue Approved' : 'Issue Reported',
          data.message,
          [{ text: 'OK', onPress: () => setIssueReported(null) }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to report issue');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to report issue. Please try again.');
    } finally {
      setReportingIssue(false);
    }
  }, [collectorLocation]);

  // Enhanced missed collection submission handler
  const handleEnhancedMissedSubmission = useCallback(async (submissionData) => {
    try {
      const token = await getToken();
      const collectorId = await resolveCollectorId();
      
      if (!token || !collectorId) {
        Alert.alert('Auth Error', 'Missing session. Please re-login.');
        return;
      }

      setSubmittingStopId(submissionData.stop_id || `${submissionData.user_id}-${submissionData.schedule_id || ''}`);

      const response = await fetch(`${API_BASE_URL}/api/enhanced-missed-collection/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...submissionData,
          collector_id: collectorId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Report Submitted', data.message);
        
        // Update local stop status
        setStops(prev => prev.map(s => (
          (s.user_id === submissionData.user_id && (s.schedule_id === submissionData.schedule_id))
            ? { ...s, latest_action: 'missed', latest_updated_at: new Date().toISOString() }
            : s
        )));

        // Close modal
        setEnhancedMissedModalVisible(false);
        setSelectedStopForMissed(null);
      } else {
        Alert.alert('Error', data.error || 'Failed to submit missed collection report.');
      }
    } catch (error) {
      console.error('Error submitting enhanced missed collection:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingStopId(null);
    }
  }, [resolveCollectorId]);

  const showResidentOnMap = useCallback((userId) => {
    const location = residentLocations.find(loc => loc.user_id === userId);
    
    if (location && mapRef) {
      setSelectedResidentLocation(location);
      // Send location to map via WebView messaging
      sendToMap({
        type: 'show_resident_location',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address,
          user_id: location.user_id
        }
      });
      
      // Draw route from collector to resident if collector location is available
      if (collectorLocation) {
        sendToMap({
          type: 'draw_route',
          from: {
            latitude: collectorLocation.latitude,
            longitude: collectorLocation.longitude
          },
          to: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });
      }
    }
  }, [residentLocations, mapRef, collectorLocation, sendToMap]);

  const centerOnCollector = useCallback(() => {
    if (collectorLocation && mapRef) {
      sendToMap({
        type: 'center_on_collector',
        location: {
          latitude: collectorLocation.latitude,
          longitude: collectorLocation.longitude
        }
      });
    } else {
      Alert.alert('Location Unavailable', 'Collector location is not available yet.');
    }
  }, [collectorLocation, mapRef, sendToMap]);

  // Fetch own profile to get collector's barangay
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return; // not logged in yet
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        console.log('Collector profile data:', data);
        const bname = data?.user?.barangay_name || data?.user?.barangay || data?.user?.address?.barangay;
        if (bname) {
          console.log('Setting collector barangay:', bname);
          setMyBarangay(String(bname));
        }
      } catch (e) {
        console.warn('Profile load error:', e?.message || e);
      }
    })();
  }, []);

  // Fetch all schedules (we'll filter in render by weekday + barangay)
  useEffect(() => {
    (async () => {
      setSchedLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/collection-schedules`);
        if (!res.ok) throw new Error('Failed to load schedules');
        const data = await res.json();
        setSchedules(Array.isArray(data) ? data : []);
      } catch (e) {
        // Surface schedule load errors only in the schedule section below
        console.warn('Schedules load error:', e?.message || e);
      } finally {
        setSchedLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header with Cancel (back) on the left and Report Issue on the right */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#222" />
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleRouteIssue}
            style={[styles.issueButton, reportingIssue && { opacity: 0.6 }]}
            disabled={reportingIssue}
          >
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.issueButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Section (MapLibre when available) */}
      <View style={styles.mapContainer}>
        <MapSection onMapReady={handleMapReady} selectedLocation={selectedResidentLocation} />
        {/* Floating button to center on collector location */}
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={centerOnCollector}
        >
          <Ionicons name="navigate" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Small hint if no resident locations available while there are stops */}
      {stops && stops.length > 0 && (!residentLocations || residentLocations.length === 0) && (
        <View style={[styles.card, { marginTop: 8 }]}> 
          <Text style={{ color: '#555' }}>
            No pinned resident locations available to show on the map. Residents need to set their Home location.
          </Text>
        </View>
      )}

      {/* Content below map: today's schedules by weekday, then assignment-aware */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {/* Today's schedules section */}
        <View style={styles.card}>
          <Text style={styles.cardText}>
            {`Today's Schedules (${new Date().toLocaleDateString('en-US', { weekday: 'long' })})`}
          </Text>
          {schedLoading ? (
            <View style={{ marginTop: 8 }}>
              <ActivityIndicator size="small" color="#2e7d32" />
            </View>
          ) : (
            (() => {
              const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
              const todayList = schedules.filter(evt => {
                const s = (evt.schedule_date || '').toString();
                return s && s.toLowerCase() === todayName.toLowerCase();
              });
              if (todayList.length === 0) {
                return (
                  <Text style={{ marginTop: 6, color: '#666' }}>
                    {myBarangay ? `No schedules for today in ${myBarangay}.` : 'No schedules found for today.'}
                  </Text>
                );
              }
              return todayList.map(evt => (
                <View key={evt.schedule_id} style={{ marginTop: 10 }}>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>
                    {evt.waste_type || 'Regular'} • {evt.time_range || evt.schedule_time || 'Time N/A'}
                  </Text>
                  <Text style={{ color: '#333', marginTop: 4 }}>
                    Barangays: {Array.isArray(evt.barangays) ? evt.barangays.map(b => b.barangay_name).join(', ') : 'N/A'}
                  </Text>
                  {myBarangay && (
                    <Text style={{ color: '#2e7d32', marginTop: 2, fontSize: 12 }}>
                      Showing only schedules that include your barangay: {myBarangay}
                    </Text>
                  )}
                </View>
              ));
            })()
          )}
        </View>

        {/* Assignment-aware section */}
        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator size="small" color="#2e7d32" />
            <Text style={{ marginTop: 8, color: '#555' }}>Loading today\'s assignment…</Text>
          </View>
        ) : assignment ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardText}>Today\'s Assignment</Text>
              <Text style={{ color: '#333', marginTop: 6 }}>
                Schedule ID: {assignment.schedule_id ?? assignment?.schedule?.schedule_id ?? 'N/A'}
              </Text>
              {assignment.waste_type && (
                <Text style={{ color: '#333' }}>Waste Type: {assignment.waste_type}</Text>
              )}
              {assignment.time_range && (
                <Text style={{ color: '#333' }}>Time Window: {assignment.time_range}</Text>
              )}
              {error && <Text style={{ color: 'red', marginTop: 6 }}>{error}</Text>}
            </View>

            {/* Stops list (placeholder if API not ready) */}
            {stops && stops.length > 0 ? (
              (() => {
                const filteredStops = stops.filter((stop) => {
                  console.log('🔍 Filtering stop:', {
                    user_id: stop.user_id,
                    resident_name: stop.resident_name,
                    latest_action: stop.latest_action,
                    subscription_status: stop.subscription_status
                  });
                  
                  // Filter 1: Hide if already collected
                  if (stop.latest_action === 'collected') {
                    console.log('❌ Filtered out - already collected:', stop.user_id);
                    return false;
                  }
                  
                  // Filter 2: Check subscription info from payment API
                  const info = paymentInfo[stop.user_id];
                  console.log('💳 Payment info for user', stop.user_id, ':', info);
                  
                  // For debugging: show stops even without payment info if they have subscription_status from backend
                  if (!info && stop.subscription_status && stop.subscription_status !== 'debug_no_subscription') {
                    console.log('⚠️ No payment info but has subscription_status:', stop.subscription_status);
                    return true; // Show it anyway for debugging
                  }
                  
                  if (!info) {
                    console.log('❌ Filtered out - no payment info and no subscription_status:', stop.user_id);
                    return false; // Hide if no subscription info
                  }
                  
                  // Filter 3: Only show active or pending_payment subscriptions
                  if (info.status && !['active', 'pending_payment'].includes(info.status)) {
                    console.log('❌ Filtered out - invalid subscription status:', info.status);
                    return false;
                  }
                  
                  console.log('✅ Stop included:', stop.user_id);
                  return true; // Show this stop
                });

                // Show empty state if all stops are filtered out
                if (filteredStops.length === 0) {
                  return (
                    <View style={styles.card}>
                      <Ionicons name="checkmark-circle" size={48} color="#4CAF50" style={{ alignSelf: 'center', marginBottom: 12 }} />
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center', marginBottom: 8 }}>
                        All Done! 🎉
                      </Text>
                      <Text style={{ color: '#666', textAlign: 'center', fontSize: 14 }}>
                        All residents in your route have been collected or don't have active subscriptions.
                      </Text>
                    </View>
                  );
                }

                return filteredStops.map((stop) => (
                <View key={stop.stop_id || `${stop.user_id}-${stop.address_id}`} style={styles.card}>
                  <TouchableOpacity 
                    onPress={() => stop.user_id && showResidentOnMap(stop.user_id)}
                    style={{ marginBottom: 10 }}
                  >
                    <Text style={[styles.cardText, { color: '#2e7d32' }]}>Stop #{stop.sequence_no ?? '-'} 📍</Text>
                    {stop.resident_name && <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>{stop.resident_name}</Text>}
                    {stop.address && <Text style={{ color: '#333' }}>📍 {stop.address}</Text>}
                    {stop.barangay_name && <Text style={{ color: '#666', fontSize: 12 }}>🏘️ {stop.barangay_name}</Text>}
                    {stop.planned_waste_type && <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>🗑️ {stop.planned_waste_type}</Text>}
                    {/* Show subscription status badge */}
                    {(() => {
                      const info = paymentInfo[stop.user_id];
                      if (info) {
                        const statusColor = info.status === 'active' ? '#4CAF50' : '#FF9800';
                        const statusText = info.status === 'active' ? '✓ Active Subscriber' : '⏳ Pending Payment';
                        return (
                          <View style={{ marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: statusColor + '20', borderWidth: 1, borderColor: statusColor }}>
                            <Text style={{ color: statusColor, fontWeight: 'bold', fontSize: 11 }}>{statusText}</Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                    {stop.latest_action && (
                      <View style={{ marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: stop.latest_action === 'collected' ? '#e8f5e9' : '#ffebee', borderWidth: 1, borderColor: stop.latest_action === 'collected' ? '#2e7d32' : '#c62828' }}>
                        <Text style={{ color: stop.latest_action === 'collected' ? '#2e7d32' : '#c62828', fontWeight: 'bold', fontSize: 12 }}>
                          {stop.latest_action === 'collected' ? 'Collected' : 'Missed'}
                        </Text>
                      </View>
                    )}
                    <Text style={{ color: '#2e7d32', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Tap to show location on map</Text>
                  </TouchableOpacity>
                  {/* Navigation button removed as requested */}
                  {/* Payment method / collection controls */}
                  {(() => {
                    const info = paymentInfo[stop.user_id];
                    if (!info) {
                      return (
                        <Text style={{ marginTop: 6, color: '#777', fontSize: 12 }}>Subscription info not available</Text>
                      );
                    }
                    if (info.payment_method === 'gcash') {
                      return (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Payment Method: GCash</Text>
                          {typeof info.price === 'number' && (
                            <Text style={{ color: '#333' }}>Plan: {info.plan_name || 'Plan'} • ₱{info.price.toFixed(2)}</Text>
                          )}
                        </View>
                      );
                    }
                    if (info.payment_method === 'cash') {
                      const boundVal = amountInputs[stop.user_id] ?? (typeof info.price === 'number' ? String(info.price) : '');
                      return (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>Payment Method: Cash on Collection</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <TextInput
                              style={{
                                flex: 1,
                                borderColor: '#ccc',
                                borderWidth: 1,
                                borderRadius: 6,
                                paddingHorizontal: 10,
                                height: 40,
                                backgroundColor: '#fff'
                              }}
                              placeholder="Amount (₱)"
                              keyboardType="numeric"
                              value={boundVal}
                              onChangeText={(t) => setAmountInputs(prev => ({ ...prev, [stop.user_id]: t }))}
                            />
                            <TouchableOpacity
                              style={[styles.smallBtn, { backgroundColor: '#2e7d32', marginLeft: 8, paddingHorizontal: 14 }]}
                              onPress={() => handleConfirmCash(stop)}
                              disabled={confirmingUserId === stop.user_id}
                            >
                              {confirmingUserId === stop.user_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm Cash</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                          {typeof info.price === 'number' && (
                            <Text style={{ color: '#666', marginTop: 4, fontSize: 12 }}>Plan: {info.plan_name || 'Plan'} • Suggested: ₱{info.price.toFixed(2)}</Text>
                          )}
                          {/* Payment Failed Button - Simple Design */}
                          <TouchableOpacity
                            style={{
                              marginTop: 8,
                              paddingVertical: 10,
                              paddingHorizontal: 16,
                              backgroundColor: '#fff',
                              borderRadius: 6,
                              borderWidth: 1.5,
                              borderColor: '#ff9800',
                              alignItems: 'center'
                            }}
                            onPress={() => showPaymentFailedOptions(stop)}
                          >
                            <Text style={{ color: '#ff9800', fontWeight: '600', fontSize: 14 }}>Payment Failed</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }
                    return (
                      <Text style={{ marginTop: 6, color: '#777', fontSize: 12 }}>Payment method: Unknown</Text>
                    );
                  })()}

                  {/* Collection action buttons */}
                  <View style={{ flexDirection: 'row', marginTop: 12 }}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]}
                      onPress={() => handleCollected(stop)}
                      disabled={submittingStopId === (stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`) || ['collected','missed'].includes(stop.latest_action)}
                    >
                      {submittingStopId === (stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Collected</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fff', borderColor: '#c62828', borderWidth: 1, marginLeft: 8 }]}
                      onPress={() => handleMissed(stop)}
                      disabled={submittingStopId === (stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`) || ['collected','missed'].includes(stop.latest_action)}
                    >
                      {submittingStopId === (stop.stop_id || `${stop.user_id}-${stop.schedule_id || ''}`) ? (
                        <ActivityIndicator size="small" color="#c62828" />
                      ) : (
                        <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Missed</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ));
              })()
            ) : (
              <>
                {/* Test Stop for user_id 140 */}
                <View style={styles.card}>
                  <TouchableOpacity 
                    onPress={() => showResidentOnMap(140)}
                    style={{ marginBottom: 10 }}
                  >
                    <Text style={[styles.cardText, { color: '#2e7d32' }]}>Stop #6 📍</Text>
                    <Text style={{ color: '#333' }}>User ID: 140</Text>
                    <Text style={{ color: '#333' }}>Address: Block 7 Lot 6, Dela Cuadra Subdivision</Text>
                    <Text style={{ color: '#333' }}>Type: Regular</Text>
                    <Text style={{ color: '#2e7d32', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Tap to show location on map</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]}
                      onPress={() => console.log('Collected pressed for stop 140')}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Collected</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fff', borderColor: '#c62828', borderWidth: 1, marginLeft: 8 }]}
                      onPress={() => console.log('Missed pressed for stop 140')}>
                      <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Missed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.card}>
                  <Text style={styles.cardText}>Assigned Areas (sample)</Text>
                  {sampleBarangays.map((b) => (
                    <Text key={b} style={{ marginTop: 6, color: '#333' }}>• {b}</Text>
                  ))}
                  <Text style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
                    Test Stop #6 added above with user_id 140 for location testing.
                  </Text>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>No regular route found for today.</Text>
            <Text style={{ color: '#555', marginTop: 6 }}>You can proceed to Special Pick Ups or go back.</Text>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]} onPress={() => router.push('/collector/specialpickup')}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go to Special Pick Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#fff', borderColor: '#2e7d32', borderWidth: 1, marginLeft: 8 }]} onPress={() => router.push('/collector/CHome')}>
                <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>Back to Home</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
          </View>
        )}
      </ScrollView>

      {/* Issue type chooser modal */}
      <Modal
        visible={issueChooserOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIssueChooserOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Report Route Issue</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => chooseIssue('truck_breakdown', 'high')}>
              <Text style={styles.optionText}>Truck breakdown</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => chooseIssue('equipment_failure', 'medium')}>
              <Text style={styles.optionText}>Equipment failure</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => chooseIssue('weather', 'medium')}>
              <Text style={styles.optionText}>Weather conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => chooseIssue('emergency', 'critical')}>
              <Text style={styles.optionText}>Emergency situation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => chooseIssue('other', 'medium')}>
              <Text style={styles.optionText}>Other issue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.cancelOption]} onPress={() => setIssueChooserOpen(false)}>
              <Text style={[styles.optionText, { color: '#c62828' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Action chooser modal */}
      <Modal
        visible={actionChooserOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setActionChooserOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Requested Action</Text>
            {selectedIssue && getActionOptions(selectedIssue.type, selectedIssue.severity).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionButton}
                onPress={async () => {
                  try {
                    const collectorId = await resolveCollectorId();
                    const token = await getToken();
                    if (!collectorId || !token) {
                      Alert.alert('Auth Error', 'Missing session. Please re-login.');
                      return;
                    }
                    const affectedScheduleIds = assignment ? [assignment.schedule_id] : [];
                    setActionChooserOpen(false);
                    await submitIssueReport(
                      collectorId,
                      token,
                      selectedIssue.type,
                      selectedIssue.severity,
                      opt.value,
                      affectedScheduleIds
                    );
                  } catch (_) {
                    Alert.alert('Error', 'Failed to report issue. Please try again.');
                  }
                }}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.optionButton, styles.cancelOption]} onPress={() => setActionChooserOpen(false)}>
              <Text style={[styles.optionText, { color: '#c62828' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enhanced Missed Collection Modal */}
      <EnhancedMissedCollectionModal
        visible={enhancedMissedModalVisible}
        onClose={() => {
          setEnhancedMissedModalVisible(false);
          setSelectedStopForMissed(null);
        }}
        onSubmit={handleEnhancedMissedSubmission}
        stop={selectedStopForMissed}
      />

      {/* Agent button removed as requested */}
      </View>
    );
  };

export default CStartCollection;

// Renders MapLibre via WebView so it works in Expo Go
const MapSection = ({ onMapReady, selectedLocation }) => {
  const [wvError, setWvError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    console.log('MapSection: mounted');
    return () => console.log('MapSection: unmounted');
  }, []);

  const html = useMemo(() => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/npm/mapbox-gl@1.13.1/dist/mapbox-gl.css" rel="stylesheet" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          html, body { background: #e6f0ff; }
          #map { background: #e6f0ff; position: absolute; inset: 0; }
          canvas { background: #e6f0ff !important; display: block; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          (function () {
            const post = (obj) => { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch (_) {} };
            try { post({ type: 'boot', message: 'WebView HTML booted' }); } catch(_) {}
            try { var c = document.createElement('canvas'); var gl = c.getContext('webgl') || c.getContext('experimental-webgl'); if (!gl) { post({ type: 'init_error', message: 'WebGL not supported. Update Android System WebView/Chrome.' }); return; } } catch (e) { post({ type: 'init_error', message: 'WebGL check failed: ' + (e && e.message ? e.message : e) }); return; }
            const styleObj = { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: 'OpenStreetMap contributors' } }, layers: [ { id: 'osm', type: 'raster', source: 'osm' } ] };
            function start() {
              try {
                const M = window.mapboxgl || window.maplibregl || window.maplibre; if (!M) { post({ type: 'init_error', message: 'Map library missing' }); return; }
                const map = new M.Map({ container: 'map', style: styleObj, center: [125.1716, 6.1164], zoom: 10 });
                let popup = null;
                function handleMessage(event){ 
                  try { 
                    const data = JSON.parse(event.data); 
                    if (data.type === 'set_resident_markers' && Array.isArray(data.markers)) { 
                      const fc = { type: 'FeatureCollection', features: data.markers.map(loc => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(loc.longitude), parseFloat(loc.latitude)] }, properties: { name: String(loc.name||'Resident'), address: String(loc.address||''), user_id: loc.user_id } })).filter(f => Number.isFinite(f.geometry.coordinates[0]) && Number.isFinite(f.geometry.coordinates[1])) }; 
                      const src = map.getSource('residents'); 
                      if (src) src.setData(fc); 
                    } else if (data.type === 'set_collector_location' && data.location) { 
                      const lng = parseFloat(data.location.longitude), lat = parseFloat(data.location.latitude); 
                      if (Number.isFinite(lng) && Number.isFinite(lat)) { 
                        const src = map.getSource('collector'); 
                        if (src) src.setData({ type: 'FeatureCollection', features: [ { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} } ] }); 
                      } 
                    } else if (data.type === 'center_on_collector' && data.location) { 
                      const lng = parseFloat(data.location.longitude), lat = parseFloat(data.location.latitude); 
                      if (Number.isFinite(lng) && Number.isFinite(lat)) { 
                        map.flyTo({ center: [lng, lat], zoom: 16, duration: 1000 }); 
                      } 
                    } else if (data.type === 'draw_route' && data.from && data.to) { 
                      const fromLng = parseFloat(data.from.longitude), fromLat = parseFloat(data.from.latitude); 
                      const toLng = parseFloat(data.to.longitude), toLat = parseFloat(data.to.latitude); 
                      if (Number.isFinite(fromLng) && Number.isFinite(fromLat) && Number.isFinite(toLng) && Number.isFinite(toLat)) { 
                        const src = map.getSource('route'); 
                        if (src) src.setData({ type: 'FeatureCollection', features: [ { type: 'Feature', geometry: { type: 'LineString', coordinates: [[fromLng, fromLat], [toLng, toLat]] }, properties: {} } ] }); 
                      } 
                    } else if (data.type === 'show_resident_location' && data.location) { 
                      const lng = parseFloat(data.location.longitude), lat = parseFloat(data.location.latitude); 
                      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return; 
                      const src = map.getSource('selected_resident'); 
                      if (src) src.setData({ type: 'FeatureCollection', features: [ { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { name: String(data.location.name||'Resident'), address: String(data.location.address||'') } } ] }); 
                      map.flyTo({ center: [lng, lat], zoom: 17, duration: 1500 }); 
                      setTimeout(() => { 
                        try { 
                          if (popup) popup.remove(); 
                          popup = new M.Popup({ offset: 10, closeButton: false }).setLngLat([lng, lat]).setHTML('<div style="font-family: sans-serif; padding: 12px; min-width: 220px"><div style="font-weight:700;color:#ff5722;margin-bottom:6px">📍 ' + (data.location.name || 'Resident') + '</div><div style="font-size:12px;color:#555">' + (data.location.address || '') + '</div></div>').addTo(map); 
                        } catch(_){} 
                      }, 100); 
                    } 
                  } catch(_){} 
                }
                window.addEventListener('message', handleMessage); document.addEventListener('message', handleMessage); window.onMessage = handleMessage;
                map.on('load', () => { 
                  post({ type: 'loaded' }); 
                  if (!map.getSource('residents')) map.addSource('residents', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getSource('selected_resident')) map.addSource('selected_resident', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getSource('collector')) map.addSource('collector', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getSource('route')) map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); 
                  if (!map.getLayer('route-layer')) map.addLayer({ id: 'route-layer', type: 'line', source: 'route', paint: { 'line-color': '#2196F3', 'line-width': 3, 'line-dasharray': [2, 2] } }); 
                  if (!map.getLayer('residents-layer')) map.addLayer({ id: 'residents-layer', type: 'circle', source: 'residents', paint: { 'circle-radius': 6, 'circle-color': '#ff5722', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } }); 
                  if (!map.getLayer('selected-resident-layer')) map.addLayer({ id: 'selected-resident-layer', type: 'circle', source: 'selected_resident', paint: { 'circle-radius': 8, 'circle-color': '#ff9800', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } }); 
                  if (!map.getLayer('collector-layer')) map.addLayer({ id: 'collector-layer', type: 'circle', source: 'collector', paint: { 'circle-radius': 6, 'circle-color': '#1976d2', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } }); 
                  map.on('click', 'residents-layer', (e) => { 
                    try { 
                      const f = e.features && e.features[0]; 
                      if (!f) return; 
                      const [lng, lat] = f.geometry.coordinates; 
                      const name = f.properties && f.properties.name; 
                      const address = f.properties && f.properties.address; 
                      if (popup) popup.remove(); 
                      popup = new M.Popup({ offset: 10, closeButton: false }).setLngLat([lng, lat]).setHTML('<div style="font-family: sans-serif; padding: 12px; min-width: 220px"><div style="font-weight:700;color:#ff5722;margin-bottom:6px">📍 ' + (name || 'Resident') + '</div><div style="font-size:12px;color:#555">' + (address || '') + '</div></div>').addTo(map); 
                    } catch(_){} 
                  }); 
                });
                map.on('error', (e) => { try { var msg = (e && e.error && e.error.message) || (e && e.message) || (e && e.type) || 'Unknown map error'; post({ type: 'map_error', message: msg }); } catch(_) { post({ type: 'map_error', message: 'Unknown map error' }); } });
              } catch (err) { post({ type: 'init_error', message: String(err && err.message || err) }); }
            }
            if (window.mapboxgl || window.maplibregl || window.maplibre) { start(); } else { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/mapbox-gl@1.13.1/dist/mapbox-gl.js'; s.async = true; s.crossOrigin = 'anonymous'; s.onload = start; s.onerror = function(){ post({ type: 'init_error', message: 'Failed to load map library' }); }; document.body.appendChild(s); }
            setTimeout(function(){ if (!(window.mapboxgl || window.maplibregl || window.maplibre)) { post({ type: 'init_error', message: 'Map library failed to load within 5s. Check internet/CDN or update Android System WebView.' }); } }, 5000);
          })();
        </script>
      </body>
    </html>
  `, []);

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Map WebView message:', data);
      if (data.type === 'loaded') setLoaded(true);
      if (data.type === 'progress') setProgress(data.message || '');
      if (data.type === 'init_error') setWvError(data.message || 'Unknown init error');
      if (data.type === 'cdn_try') setProgress(`Trying: ${data.url}`);
      if (data.type === 'cdn_error') setProgress(`Failed: ${data.url}`);
      if (data.type === 'boot') setProgress('Booted');
      // Removed console log display to clean up the WebView
    } catch {
      // ignore
    }
  }, [loaded]);

  const onError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('MapSection WebView: onError', nativeEvent);
    setWvError(nativeEvent?.description || 'WebView failed to load');
  }, []);

  return (
    <View
      style={styles.mapWrapper}
      onLayout={useCallback((e) => {
        const { width, height } = e.nativeEvent.layout || {};
        console.log('MapSection: mapWrapper layout', { width, height });
      }, [])}
    >
      {/* Blue fallback layer under the WebView to guarantee visible background */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#e6f0ff' }} pointerEvents="none" />
      <WebView
        ref={useCallback((ref) => {
          if (ref && onMapReady) {
            onMapReady(ref);
          }
        }, [onMapReady])}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.map}
        containerStyle={{ backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowFileAccess
        allowUniversalAccessFromFileURLs
        onShouldStartLoadWithRequest={() => true}
        onLoadStart={(e) => console.log('MapSection WebView: onLoadStart', e?.nativeEvent?.url)}
        onLoadEnd={(e) => console.log('MapSection WebView: onLoadEnd', e?.nativeEvent?.url)}
        onNavigationStateChange={(nav) => console.log('MapSection WebView: nav change', nav && { url: nav.url, loading: nav.loading })}
        onHttpError={(e) => setWvError(`HTTP ${e?.nativeEvent?.statusCode} while loading resource`)}
        onMessage={onMessage}
        onError={onError}
        androidLayerType="hardware"
        injectedJavaScriptBeforeContentLoaded={`
          (function(){
            function wrap(level){
              var orig = console[level];
              console[level] = function(){
                try {
                  var args = Array.prototype.slice.call(arguments).map(function(a){
                    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e){ return String(a); }
                  });
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', level: level, args: args }));
                  }
                } catch (e) {}
                orig && orig.apply(console, arguments);
              };
            }
            ['log','info','warn','error'].forEach(wrap);
            window.addEventListener('error', function(e){
              try {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', level: 'error', args: ['window.error', e.message] }));
                }
              } catch(_e){}
            });
          })();
        `}
      />
      {!loaded && (
        <Text style={{ position: 'absolute', color: '#555' }}>Loading map… {progress}</Text>
      )}
      {!loaded && wvError && (
        <Text style={{ position: 'absolute', bottom: 8, color: 'red' }}>Map error: {wvError}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    paddingBottom: 8,
    elevation: 2,
    zIndex: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#222',
    textDecorationLine: 'underline',
  },
  mapContainer: {
    height: 300,
    width: '100%',
    backgroundColor: '#e6f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#e6f0ff',
    overflow: 'hidden',
    borderColor: '#0a3d91',
    borderWidth: 1,
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  issueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  issueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: '#f7f7f7',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 10,
  },
  optionText: {
    color: '#222',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelOption: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffcdd2',
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
}); 