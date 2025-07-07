import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken, getRole } from './auth';

export default function AuthGate({ children }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      const role = await getRole();
      if (token && role) {
        if (role === 'resident') {
          router.replace('/resident/HomePage');
        } else if (role === 'collector') {
          router.replace('/collector/CHome');
        } else {
          router.replace('/role');
        }
      } else {
        router.replace('/role');
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]); // Add router to dependency array

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return children;
}
