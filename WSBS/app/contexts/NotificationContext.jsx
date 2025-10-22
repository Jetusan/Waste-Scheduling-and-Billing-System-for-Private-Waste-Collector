import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getToken } from '../auth';
import { API_BASE_URL } from '../config';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const appState = useRef(AppState.currentState);
  const lastFetchRef = useRef(0);
  const intervalRef = useRef(null);

  const fetchUnreadCount = async (force = false) => {
    // Debounce: Don't fetch if we just fetched within the last 3 seconds (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 3000) {
      console.log('🔔 Skipping notification fetch - too soon after last fetch');
      return;
    }
    
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setUnreadCount(0);
        return;
      }
      
      lastFetchRef.current = now;
      console.log('🔔 Fetching notification count...');
      const res = await fetch(`${API_BASE_URL}/api/notifications/me/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (res.ok && data?.success) {
        const newCount = Number(data.count) || 0;
        console.log('🔔 Notification count updated:', newCount);
        setUnreadCount(newCount);
      }
    } catch (error) {
      console.error('🔔 Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manually decrease unread count (when marking as read)
  const decreaseUnreadCount = (amount = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
    console.log('🔔 Decreased unread count by', amount);
  };

  // Manually increase unread count (when new notification arrives)
  const increaseUnreadCount = (amount = 1) => {
    setUnreadCount(prev => prev + amount);
    console.log('🔔 Increased unread count by', amount);
  };

  // Reset unread count (when marking all as read)
  const resetUnreadCount = () => {
    setUnreadCount(0);
    console.log('🔔 Reset unread count to 0');
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔔 App has come to the foreground - will refresh notifications');
        fetchUnreadCount();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Periodic refresh (every 30 seconds when app is active)
  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    fetchUnreadCount();
    
    // Set up interval for periodic refresh
    intervalRef.current = setInterval(() => {
      if (mounted && appState.current === 'active') {
        fetchUnreadCount();
      }
    }, 30000); // 30 seconds

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const value = {
    unreadCount,
    loading,
    fetchUnreadCount,
    decreaseUnreadCount,
    increaseUnreadCount,
    resetUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
