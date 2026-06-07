import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill}>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerTitle: "",
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="members/[id]" options={{ headerBackTitle: "Search" }} />
      </Stack>
    </LinearGradient>
  );
}
