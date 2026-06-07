import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import { AuthProvider } from "../lib/auth";
import { AuthButton } from "../components/AuthButton";

/** Home button shown at the top-left of screens with a header. */
function HomeButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.navigate("/")}
      hitSlop={12}
      accessibilityLabel="Home"
      style={styles.homeBtn}
    >
      <Ionicons name="home" size={22} color={colors.primaryDark} />
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
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
          <Stack.Screen
            name="members/[id]"
            options={{ headerLeft: () => <HomeButton />, headerRight: () => <AuthButton /> }}
          />
        </Stack>
      </LinearGradient>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  homeBtn: { paddingHorizontal: 8, paddingVertical: 6 },
});
