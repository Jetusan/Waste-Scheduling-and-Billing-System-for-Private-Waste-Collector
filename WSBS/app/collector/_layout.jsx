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
      <Stack.Screen name="CHome" />
      <Stack.Screen name="LCO" />
      <Stack.Screen name="CSchedule" />
      <Stack.Screen name="CNotif" />
      <Stack.Screen name="SpecialPickup" />
      <Stack.Screen name="CStartCollection" />
      <Stack.Screen name="AgentPage" />
    </Stack>
  );
}
