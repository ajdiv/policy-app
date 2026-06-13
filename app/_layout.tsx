import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space } from "../lib/theme";
import { ThemeProvider, useTheme } from "../lib/theme-context";
import { ThemeToggle } from "../components/ThemeToggle";
import { AuthProvider } from "../lib/auth";
import { AuthButton } from "../components/AuthButton";

/** Home button shown at the top-left of screens with a header. */
function HomeButton() {
  const router = useRouter();
  const { colors } = useTheme();
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

/** Theme toggle + auth control, shown on the right of inner-screen headers. */
function HeaderRight() {
  return (
    <View style={styles.headerRight}>
      <ThemeToggle />
      <AuthButton />
    </View>
  );
}

function ThemedApp() {
  const { colors } = useTheme();
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
        <Stack.Screen
          name="members/[id]"
          options={{ headerLeft: () => <HomeButton />, headerRight: () => <HeaderRight /> }}
        />
        <Stack.Screen
          name="bills/index"
          options={{ headerLeft: () => <HomeButton />, headerRight: () => <HeaderRight /> }}
        />
        <Stack.Screen
          name="bills/[id]"
          options={{ headerLeft: () => <HomeButton />, headerRight: () => <HeaderRight /> }}
        />
      </Stack>
    </LinearGradient>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  homeBtn: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  headerRight: { flexDirection: "row", alignItems: "center" },
});
