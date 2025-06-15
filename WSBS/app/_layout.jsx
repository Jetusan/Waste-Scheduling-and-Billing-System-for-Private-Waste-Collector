import { Stack } from 'expo-router';
import { AuthProvider } from './context/AuthContext';

export default function Layout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fff' },
        }}
      >
        {/* Define main screens */}
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="role" />
        <Stack.Screen name="RLogin" />
        <Stack.Screen name="RRegister" />
      </Stack>
    </AuthProvider>
  );
}