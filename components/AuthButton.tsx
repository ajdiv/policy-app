import { Text, View, Pressable, Image, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

/** Header control: "Sign in with Google" when logged out; an avatar/name pill with a Sign out action when logged in. */
export function AuthButton() {
  const { user, configured, busy, signIn, signOut } = useAuth();

  if (!configured) return null; // hidden until a Google client ID is configured

  if (user) {
    const label = user.name ?? user.email;
    return (
      <View style={styles.chip}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{label.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.divider} />
        <Pressable onPress={signOut} hitSlop={8} accessibilityLabel="Sign out">
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={styles.signInBtn} onPress={signIn} disabled={busy}>
      <Text style={styles.signInText}>{busy ? "Signing in…" : "Sign in with Google"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  signInText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    maxWidth: 300,
  },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#eef2ff" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  name: { color: colors.text, fontWeight: "600", fontSize: 13, flexShrink: 1 },
  divider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: colors.border, marginHorizontal: 2 },
  signOut: { color: colors.primary, fontWeight: "700", fontSize: 13 },
});
