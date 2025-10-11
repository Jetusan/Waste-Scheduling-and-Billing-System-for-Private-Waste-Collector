import { Stack } from 'expo-router';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Layout() {
  return (
    <ErrorBoundary fallbackMessage="The app encountered an error. Please restart the app.">
      <WebSocketProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' },
          }}
        >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="role" />
      <Stack.Screen name="RLogin" />
      <Stack.Screen name="RRegister" />
      <Stack.Screen 
        name="collector" 
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="resident" 
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="SPickup" 
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="Subscription" 
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="Schedule" 
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="CSettings" 
        options={{
          headerShown: false
        }}
      />
    </Stack>
      </WebSocketProvider>
    </ErrorBoundary>
  );
}
