# WebSocket Implementation for Residents

## 🎯 **Why Residents Need WebSocket**

### **Key Benefits:**

1. **Real-Time Collection Notifications**
   - "Collector is 5 minutes away"
   - "Your waste has been collected"
   - "Collection completed - Thank you!"

2. **Live Payment Updates**
   - Payment confirmed instantly
   - Invoice status changes
   - Subscription activation

3. **Schedule Changes**
   - Missed collection notifications
   - Rescheduled pickup alerts
   - Emergency schedule changes

4. **Better User Experience**
   - No manual refresh needed
   - Instant feedback
   - Modern real-time feel

---

## 🔧 **Implementation Steps**

### **Step 1: Update WebSocket Context**

Add resident support to `contexts/WebSocketContext.jsx`:

```javascript
// Add to connect function
const connect = useCallback(async () => {
  try {
    const userId = await getUserId(); // Get user_id
    const role = await getUserRole(); // Get role (resident/collector)
    
    if (!userId) {
      console.log('No user ID found, skipping WebSocket connection');
      return;
    }

    // Different room based on role
    let room;
    if (role === 'collector') {
      const cid = await getCollectorId();
      room = `collector_${cid}`;
    } else if (role === 'resident') {
      room = `resident_${userId}`;
    }

    // ... rest of connection code
    
    // Join appropriate room
    newSocket.emit('join_room', { userId, role, room });
    
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
  }
}, []);
```

### **Step 2: Update Backend WebSocket Service**

Add resident room handling in `backend/services/websocketService.js`:

```javascript
// Add new function
function emitResidentNotification(userId, notification) {
  if (!io) return;
  
  const room = `resident_${userId}`;
  io.to(room).emit('notification', {
    type: 'notification',
    userId,
    timestamp: new Date().toISOString(),
    ...notification
  });
  
  console.log(`🔔 Emitted notification to resident ${userId}`);
}

// Add new function
function emitCollectionStatus(userId, status) {
  if (!io) return;
  
  const room = `resident_${userId}`;
  io.to(room).emit('collection_status', {
    type: 'collection_status',
    userId,
    timestamp: new Date().toISOString(),
    ...status
  });
  
  console.log(`📦 Emitted collection status to resident ${userId}`);
}

module.exports = {
  // ... existing exports
  emitResidentNotification,
  emitCollectionStatus
};
```

### **Step 3: Update Backend Collection Events**

In `routes/collectorAssignments.js`, emit to residents:

```javascript
if (action === 'collected') {
  // Existing collector notification
  await notifyResident(user_id, 'Collection completed', 'Your waste was collected today. Thank you!');
  
  // NEW: Real-time WebSocket notification to resident
  try {
    const { emitResidentNotification, emitCollectionStatus } = require('../services/websocketService');
    
    // Notify resident in real-time
    emitResidentNotification(user_id, {
      title: 'Collection Completed',
      message: 'Your waste has been collected. Thank you!',
      type: 'collection_completed'
    });
    
    // Update collection status
    emitCollectionStatus(user_id, {
      status: 'collected',
      collector_id,
      timestamp: new Date().toISOString()
    });
  } catch (wsError) {
    console.warn('WebSocket emission failed:', wsError.message);
  }
}
```

### **Step 4: Create Resident Home Component**

Update `app/resident/RHome.jsx` (or similar):

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWebSocket } from '../../contexts/WebSocketContext';

const RHome = () => {
  const { isConnected, subscribe } = useWebSocket();
  const [lastCollection, setLastCollection] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribeNotification = subscribe('notification', (data) => {
      console.log('🔔 Received notification:', data);
      setNotifications(prev => [data, ...prev]);
      
      // Show toast/alert
      Alert.alert(data.title, data.message);
    });

    const unsubscribeStatus = subscribe('collection_status', (data) => {
      console.log('📦 Collection status update:', data);
      setLastCollection(data);
    });

    return () => {
      unsubscribeNotification();
      unsubscribeStatus();
    };
  }, [subscribe]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resident Dashboard</Text>
      
      {/* Connection Status */}
      {isConnected && (
        <View style={styles.connectionBadge}>
          <View style={styles.connectionDot} />
          <Text style={styles.connectionText}>Live Updates Active</Text>
        </View>
      )}
      
      {/* Last Collection Status */}
      {lastCollection && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Last Collection</Text>
          <Text style={styles.statusText}>
            Status: {lastCollection.status}
          </Text>
          <Text style={styles.statusTime}>
            {new Date(lastCollection.timestamp).toLocaleString()}
          </Text>
        </View>
      )}
      
      {/* Recent Notifications */}
      <View style={styles.notificationsSection}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        {notifications.map((notif, index) => (
          <View key={index} style={styles.notificationCard}>
            <Text style={styles.notifTitle}>{notif.title}</Text>
            <Text style={styles.notifMessage}>{notif.message}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default RHome;
```

---

## 📱 **Resident Use Cases**

### **1. Collection Tracking**
```
Collector starts route
    ↓
Backend emits: "Collector is on your street"
    ↓
Resident sees notification
    ↓
Resident prepares waste
```

### **2. Collection Confirmation**
```
Collector marks as collected
    ↓
Backend emits: "Collection completed"
    ↓
Resident sees instant confirmation
    ↓
No need to check app later
```

### **3. Payment Updates**
```
Payment processed
    ↓
Backend emits: "Payment confirmed"
    ↓
Resident sees instant update
    ↓
Subscription activated immediately
```

### **4. Schedule Changes**
```
Admin reschedules collection
    ↓
Backend emits: "Schedule changed"
    ↓
Resident notified immediately
    ↓
No missed collections
```

---

## 🎨 **UI Components for Residents**

### **1. Live Status Badge**
```javascript
{isConnected && (
  <View style={styles.liveBadge}>
    <Text>🟢 Live Updates Active</Text>
  </View>
)}
```

### **2. Real-Time Notifications**
```javascript
<FlatList
  data={notifications}
  renderItem={({ item }) => (
    <NotificationCard notification={item} />
  )}
/>
```

### **3. Collection Status Tracker**
```javascript
<View style={styles.tracker}>
  <Text>Collector Status:</Text>
  <Text>{collectorStatus}</Text>
  {/* e.g., "5 minutes away", "Collecting now", "Completed" */}
</View>
```

---

## 🔔 **Notification Types for Residents**

| Event | Title | Message |
|-------|-------|---------|
| `collector_nearby` | "Collector Nearby" | "Your collector is 5 minutes away" |
| `collection_completed` | "Collection Completed" | "Your waste has been collected" |
| `collection_missed` | "Collection Missed" | "We couldn't collect today. Next: [date]" |
| `payment_confirmed` | "Payment Confirmed" | "Your payment of ₱X has been received" |
| `schedule_changed` | "Schedule Updated" | "Your collection day has changed to [day]" |
| `subscription_activated` | "Subscription Active" | "Your subscription is now active" |

---

## 📊 **Priority Implementation**

### **High Priority (Implement First):**
1. ✅ Collection completion notifications
2. ✅ Payment confirmation updates
3. ✅ Schedule change alerts

### **Medium Priority (Nice to Have):**
4. 📍 Collector location tracking
5. ⏰ Reminder notifications
6. 💬 Chat with collector

### **Low Priority (Future Enhancement):**
7. 📊 Usage statistics
8. 🎯 Gamification updates
9. 🏆 Achievement notifications

---

## 🚀 **Quick Start for Residents**

### **Minimal Implementation (15 minutes):**

1. **Update WebSocket Context** - Add resident room support
2. **Update Backend** - Emit to resident rooms on collection
3. **Update Resident Home** - Subscribe to notifications
4. **Test** - Mark collection and see instant notification

### **Full Implementation (1-2 hours):**
- All notification types
- UI components
- Connection status
- Notification history
- Sound/vibration alerts

---

## 💡 **Recommendation**

**YES, implement WebSocket for residents!**

**Why:**
- ✅ Significantly improves user experience
- ✅ Reduces support requests ("Was my waste collected?")
- ✅ Increases engagement
- ✅ Modern, professional feel
- ✅ Competitive advantage

**Start with:**
1. Collection completion notifications
2. Payment confirmations
3. Schedule changes

**Then add:**
- Live collector tracking
- Chat functionality
- Advanced notifications
