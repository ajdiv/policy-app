import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1d3557" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#f5f6f8" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "policy-app" }} />
      <Stack.Screen name="members/[id]" options={{ title: "Profile" }} />
    </Stack>
  );
}
