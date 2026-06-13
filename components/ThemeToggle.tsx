import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import { radius, space } from "../lib/theme";

/** Sun/moon control that flips between light and dark themes. */
export function ThemeToggle() {
  const { colors, isDark, toggle } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
      style={[styles.btn, { backgroundColor: colors.evidenceBg, borderColor: colors.border }]}
    >
      <Ionicons name={isDark ? "sunny" : "moon"} size={18} color={colors.primaryDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.sm,
  },
});
