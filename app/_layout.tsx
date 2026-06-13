import { Stack, useRouter } from "expo-router";
import { ThemeProvider as NavThemeProvider, DefaultTheme, DarkTheme } from "@react-navigation/native";
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
  const { colors, scheme, isDark } = useTheme();
  // Make React Navigation's scene background transparent so our gradient shows
  // through (its default theme paints an opaque rgb(242,242,242) over it).
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: "transparent", card: "transparent" } };
  return (
    // key on scheme so the web gradient repaints on theme change (its `colors`
    // prop alone doesn't always trigger a repaint in expo-linear-gradient web).
    <LinearGradient key={scheme} colors={colors.bgGradient} style={StyleSheet.absoluteFill}>
      <NavThemeProvider value={navTheme}>
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
      </NavThemeProvider>
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
