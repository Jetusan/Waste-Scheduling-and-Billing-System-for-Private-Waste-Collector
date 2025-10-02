# WebSocket Implementation for Admin Dashboard

## 🎯 **Current Status**

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

### **What's Already Done:**
✅ Backend emits `admin_update` events  
✅ Admin room support in WebSocket service  
❌ Frontend admin dashboard NOT connected yet  

---

## 🔧 **What Needs to Be Implemented**

### **Backend (Already Done ✅)**

In `routes/collectorAssignments.js`:
```javascript
// Already emitting to admin
emitAdminUpdate({
  type: 'collection_completed',
  collector_id,
  user_id,
  timestamp: new Date().toISOString()
});
```

In `services/websocketService.js`:
```javascript
// Already has admin functions
function emitAdminUpdate(data) {
  if (!io) return;
  io.to('admin').emit('admin_update', {
    type: 'admin_update',
    timestamp: new Date().toISOString(),
    ...data
  });
}
```

### **Frontend Admin (NOT DONE ❌)**

The admin dashboard (React web app) needs WebSocket integration.

---

## 🚀 **Admin Dashboard Implementation**

### **Step 1: Install Socket.IO Client**

```bash
cd admin
npm install socket.io-client@^4.7.2
```

### **Step 2: Create WebSocket Context for Admin**

Create `admin/src/contexts/WebSocketContext.jsx`:

```javascript
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});

  const connect = useCallback(() => {
    // Get API URL from environment or config
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    console.log('🔌 Admin connecting to WebSocket:', baseUrl);

    const newSocket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('✅ Admin WebSocket connected:', newSocket.id);
      setIsConnected(true);
      
      // Join admin room
      newSocket.emit('join_admin');
    });

    newSocket.on('joined', (data) => {
      console.log('✅ Admin joined room:', data);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Admin WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Admin WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for admin updates
    newSocket.on('admin_update', (data) => {
      console.log('📡 Admin received update:', data);
      if (listenersRef.current.admin_update) {
        listenersRef.current.admin_update.forEach(callback => callback(data));
      }
    });

    // Listen for collection updates
    newSocket.on('collection_update', (data) => {
      console.log('📦 Admin received collection update:', data);
      if (listenersRef.current.collection_update) {
        listenersRef.current.collection_update.forEach(callback => callback(data));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Admin disconnecting WebSocket');
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);

    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(cb => cb !== callback);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  const value = {
    socket,
    isConnected,
    connect,
    disconnect,
    subscribe
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

### **Step 3: Wrap Admin App**

Update `admin/src/App.jsx`:

```javascript
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        {/* Your existing routes */}
      </Router>
    </WebSocketProvider>
  );
}
```

### **Step 4: Update Admin Dashboard**

Update `admin/src/components/MDashboard.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

const MDashboard = () => {
  const { isConnected, subscribe } = useWebSocket();
  const [recentCollections, setRecentCollections] = useState([]);
  const [stats, setStats] = useState({
    todayCollections: 0,
    activeCollectors: 0,
    pendingPickups: 0
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeAdmin = subscribe('admin_update', (data) => {
      console.log('📊 Admin dashboard update:', data);
      
      if (data.type === 'collection_completed') {
        // Add to recent collections
        setRecentCollections(prev => [data, ...prev.slice(0, 9)]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          todayCollections: prev.todayCollections + 1
        }));
      }
    });

    const unsubscribeCollection = subscribe('collection_update', (data) => {
      console.log('📦 Collection update:', data);
      // Handle collection updates
    });

    return () => {
      unsubscribeAdmin();
      unsubscribeCollection();
    };
  }, [subscribe]);

  return (
    <div className="dashboard">
      {/* Connection Status */}
      {isConnected && (
        <div className="connection-badge">
          <span className="connection-dot"></span>
          <span>Live Updates Active</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today's Collections</h3>
          <p className="stat-value">{stats.todayCollections}</p>
        </div>
        {/* More stat cards */}
      </div>

      {/* Recent Collections (Real-Time) */}
      <div className="recent-collections">
        <h3>Recent Collections (Live)</h3>
        {recentCollections.map((collection, index) => (
          <div key={index} className="collection-item">
            <span>Collector #{collection.collector_id}</span>
            <span>User #{collection.user_id}</span>
            <span>{new Date(collection.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MDashboard;
```

---

## 🎨 **Admin Dashboard Features**

### **1. Real-Time Collection Monitor**
```javascript
// Live feed of collections as they happen
<div className="live-feed">
  <h3>🔴 Live Collections</h3>
  {recentCollections.map(c => (
    <div className="feed-item">
      <span>Collector {c.collector_id} completed collection</span>
      <span>{timeAgo(c.timestamp)}</span>
    </div>
  ))}
</div>
```

### **2. Active Collectors Map**
```javascript
// Show collectors on map with real-time updates
<div className="collectors-map">
  {activeCollectors.map(collector => (
    <Marker
      position={collector.location}
      icon={collectorIcon}
      label={`Collector ${collector.id}`}
    />
  ))}
</div>
```

### **3. Live Statistics**
```javascript
// Stats that update in real-time
<div className="live-stats">
  <StatCard
    title="Collections Today"
    value={todayCollections}
    trend="up"
    live={true}
  />
  <StatCard
    title="Active Collectors"
    value={activeCollectors}
    live={true}
  />
</div>
```

### **4. Notification Center**
```javascript
// Real-time notifications for admin
<NotificationCenter>
  {notifications.map(notif => (
    <Notification
      type={notif.type}
      message={notif.message}
      timestamp={notif.timestamp}
    />
  ))}
</NotificationCenter>
```

---

## 📊 **Admin Update Types**

| Event Type | Description | Data |
|------------|-------------|------|
| `collection_completed` | Collection finished | `{ collector_id, user_id, timestamp }` |
| `collection_missed` | Collection missed | `{ collector_id, user_id, reason }` |
| `collector_online` | Collector started shift | `{ collector_id, location }` |
| `collector_offline` | Collector ended shift | `{ collector_id }` |
| `emergency_reported` | Emergency issue | `{ collector_id, issue_type }` |
| `payment_received` | Payment processed | `{ user_id, amount }` |
| `new_registration` | New user registered | `{ user_id, role }` |

---

## 🎯 **Priority Features for Admin**

### **High Priority:**
1. ✅ Real-time collection monitoring
2. ✅ Live statistics updates
3. ✅ Active collector tracking
4. ✅ Emergency alerts

### **Medium Priority:**
5. 📍 Collector location map
6. 📊 Live analytics dashboard
7. 🔔 Notification center
8. 💬 Chat with collectors

### **Low Priority:**
9. 📈 Real-time charts
10. 🎥 Live video feed
11. 🤖 AI insights

---

## 🚀 **Quick Start for Admin**

### **Minimal Implementation (30 minutes):**

```bash
# 1. Install dependency
cd admin
npm install socket.io-client@^4.7.2

# 2. Create WebSocket context (copy code above)

# 3. Wrap App with provider

# 4. Subscribe to updates in dashboard

# 5. Test - mark collection and see live update
```

---

## 💡 **Recommendation**

### **For Admin Dashboard:**

**YES, implement WebSocket!**

**Benefits:**
- ✅ Monitor operations in real-time
- ✅ Respond to issues immediately
- ✅ Better oversight of collectors
- ✅ Professional, modern dashboard
- ✅ Reduced need to refresh

**Start with:**
1. Real-time collection feed
2. Live statistics
3. Connection status indicator

**Then add:**
- Collector location tracking
- Emergency alerts
- Live analytics

---

## 📝 **Summary**

### **Current Status:**

| Component | Status | Priority |
|-----------|--------|----------|
| **Collector** | ✅ Implemented | High |
| **Resident** | ❌ Not Implemented | High |
| **Admin** | ⚠️ Backend Ready, Frontend Needed | High |

### **Recommendation:**

1. **Keep Collector** - Already working perfectly ✅
2. **Add Resident** - High priority for UX 🔥
3. **Complete Admin** - Essential for monitoring 🔥

All three roles benefit significantly from WebSocket!
