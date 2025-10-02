// This file is not a route - it's a context provider
// Expo Router should ignore this file
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import { getCollectorId } from '../auth';

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
  const [collectorId, setCollectorId] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef({});

  // Initialize WebSocket connection
  const connect = useCallback(async () => {
    try {
      const cid = await getCollectorId();
      if (!cid) {
        console.log('No collector ID found, skipping WebSocket connection');
        return;
      }

      setCollectorId(cid);

      // Extract base URL without /api
      const baseUrl = API_BASE_URL.replace('/api', '');
      
      console.log('🔌 Connecting to WebSocket:', baseUrl);

      const newSocket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log('✅ WebSocket connected:', newSocket.id);
        setIsConnected(true);
        
        // Join collector-specific room
        newSocket.emit('join_collector', cid);
      });

      newSocket.on('joined', (data) => {
        console.log('✅ Joined room:', data);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        setIsConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      });

      // Listen for collection updates
      newSocket.on('collection_update', (data) => {
        console.log('📡 Received collection_update:', data);
        if (listenersRef.current.collection_update) {
          listenersRef.current.collection_update.forEach(callback => callback(data));
        }
      });

      // Listen for stats updates
      newSocket.on('stats_update', (data) => {
        console.log('📊 Received stats_update:', data);
        if (listenersRef.current.stats_update) {
          listenersRef.current.stats_update.forEach(callback => callback(data));
        }
      });

      // Listen for notifications
      newSocket.on('notification', (data) => {
        console.log('🔔 Received notification:', data);
        if (listenersRef.current.notification) {
          listenersRef.current.notification.forEach(callback => callback(data));
        }
      });

      // Ping-pong for connection health
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping');
        }
      }, 30000); // Every 30 seconds

      newSocket.on('pong', () => {
        console.log('🏓 Pong received');
      });

      setSocket(newSocket);

      return () => {
        clearInterval(pingInterval);
        newSocket.close();
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Disconnecting WebSocket');
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Subscribe to events
  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);

    // Return unsubscribe function
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(cb => cb !== callback);
    };
  }, []);

  // Emit event
  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Cannot emit event, socket not connected');
    }
  }, [socket, isConnected]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, []);

  const value = {
    socket,
    isConnected,
    collectorId,
    connect,
    disconnect,
    subscribe,
    emit
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
