import { Stack, useRouter, usePathname } from "expo-router";
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getToken, getRole } from "../auth";
import ApiErrorBoundary from "../components/ApiErrorBoundary";

export default function CollectorLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const currentPath = pathname || '';
      const isCollectorRoute = currentPath.startsWith('/collector');

      if (!isCollectorRoute) {
        if (isMounted) {
          setChecked(true);
        }
        return;
      }

      try {
        const [token, role] = await Promise.all([getToken(), getRole()]);

        if (!token || role !== 'collector') {
          if (currentPath !== '/collector/CLogin') {
            router.replace('/collector/CLogin');
          }
        } else if (currentPath === '/collector/CLogin') {
          router.replace('/collector/CHome');
        }
      } finally {
        if (isMounted) {
          setChecked(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4CD964" />
      </View>
    );
  }

  return (
    <ApiErrorBoundary 
      fallbackMessage="Collector app encountered an error. Please try again."
      onAuthError={() => router.replace('/role')}
    >
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
    </ApiErrorBoundary>
  );
}
