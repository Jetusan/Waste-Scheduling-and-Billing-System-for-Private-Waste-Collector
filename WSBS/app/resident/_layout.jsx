import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
import { View, Text, AppState } from "react-native";
import { API_BASE_URL } from "../config";
import { getToken } from "../auth";

export default function ResidentLayout() {
  const [unread, setUnread] = useState(0);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const intervalRef = useRef(null);

  const fetchUnread = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUnread(0);
        return;
      }
      
      console.log('🔔 Fetching notification count...');
      const res = await fetch(`${API_BASE_URL}/api/notifications/me/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (res.ok && data?.success) {
        const newCount = Number(data.count) || 0;
        console.log('🔔 Notification count:', newCount);
        setUnread(newCount);
      }
    } catch (error) {
      console.error('🔔 Error fetching notifications:', error);
    }
  };

  // Handle app state changes for better real-time updates
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔔 App has come to the foreground - refreshing notifications');
        fetchUnread(); // Refresh immediately when app becomes active
      }
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Main notification polling effect
  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    if (mounted) {
      fetchUnread();
    }

    // Set up more frequent polling (3 seconds instead of 10)
    intervalRef.current = setInterval(() => {
      if (mounted && appStateVisible === 'active') {
        fetchUnread();
      }
    }, 3000); // Reduced from 10000ms to 3000ms for more real-time feel

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [appStateVisible]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4CD964",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      {/* Explicitly define the screens to include in the tab bar */}
      <Tabs.Screen
        name="HomePage"
        options={{
          headerShown: false,
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="NotifPage"
        options={{
          headerShown: false,
          title: "Notification",
          tabBarIcon: ({ color, size }) => (
            <View style={{ width: size, height: size }}>
              <Ionicons name="notifications-outline" size={size} color={color} />
              {unread > 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: "#FF3B30",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                    {unread > 99 ? "99+" : String(unread)}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="FeedbackPage"
        options={{
          headerShown: false,
          title: "Feedback",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AccountPage"
        options={{
          headerShown: false,
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}