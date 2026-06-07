import { Text, Pressable, Image, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

/** Header control: "Sign in with Google" when logged out, an avatar/name chip (tap to sign out) when logged in. */
export function AuthButton() {
  const { user, configured, busy, signIn, signOut } = useAuth();

  if (!configured) return null; // hidden until a Google client ID is configured

  if (user) {
    return (
      <Pressable style={styles.chip} onPress={signOut} accessibilityLabel="Sign out">
        {user.picture ? <Image source={{ uri: user.picture }} style={styles.avatar} /> : null}
        <Text style={styles.name} numberOfLines={1}>
          {user.name ?? user.email}
        </Text>
        <Text style={styles.signOut}>· Sign out</Text>
      </Pressable>
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signInText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 240,
  },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#eef2ff" },
  name: { color: colors.text, fontWeight: "600", fontSize: 13, flexShrink: 1 },
  signOut: { color: colors.muted, fontSize: 12 },
});
