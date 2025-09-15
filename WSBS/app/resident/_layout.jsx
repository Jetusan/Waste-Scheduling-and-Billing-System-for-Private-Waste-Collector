import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { API_BASE_URL } from "../config";
import { getToken } from "../auth";

export default function ResidentLayout() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timer;
    const fetchUnread = async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (mounted) setUnread(0);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/notifications/me/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (mounted) {
          if (res.ok && data?.success) {
            setUnread(Number(data.count) || 0);
          }
        }
      } catch (_) {
        // ignore; keep previous
      }
    };

    fetchUnread();
    timer = setInterval(fetchUnread, 10000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

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