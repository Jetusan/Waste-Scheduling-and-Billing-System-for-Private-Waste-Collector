import { Stack, useRouter, usePathname } from "expo-router";
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getToken, getRole } from "../auth";

export default function CollectorLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [token, role] = await Promise.all([getToken(), getRole()]);
        if (!token || role !== 'collector') {
          // Avoid redirect loop when already on the login screen
          if (pathname !== '/collector/CLogin') {
            router.replace('/collector/CLogin');
          }
        }
      } finally {
        setChecked(true);
      }
    })();
  }, [router, pathname]);

  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4CD964" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="CLogin" />
      <Stack.Screen name="CHome" />
      <Stack.Screen name="LCO" />
      <Stack.Screen name="CSchedule" />
      <Stack.Screen name="CNotif" />
      <Stack.Screen name="specialpickup" />
      <Stack.Screen name="CStartCollection" />
      <Stack.Screen name="AgentPage" />
    </Stack>
  );
}
