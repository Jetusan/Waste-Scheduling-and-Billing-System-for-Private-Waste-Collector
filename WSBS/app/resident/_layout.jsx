import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text } from "react-native";
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';

function ResidentTabsContent() {
  const { unreadCount } = useNotification();

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
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -3,
                    backgroundColor: '#FF1744',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
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

export default function ResidentLayout() {
  return (
    <NotificationProvider>
      <ResidentTabsContent />
    </NotificationProvider>
  );
}