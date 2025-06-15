import { Stack } from "expo-router";

export default function CollectorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="CLogin" />
    </Stack>
  );
}
