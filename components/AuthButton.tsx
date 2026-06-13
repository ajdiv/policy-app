import { Text, View, Pressable, Image, StyleSheet } from "react-native";
import { useAuth } from "../lib/auth";
import { colors, space, radius, fontSize, fontWeight } from "../lib/theme";

/** Header control: "Sign in with Google" when logged out; an avatar/name pill with a Sign out action when logged in. */
export function AuthButton() {
  const { user, configured, busy, signIn, signOut } = useAuth();

  if (!configured) return null; // hidden until a Google client ID is configured

  if (user) {
    const label = user.name ?? user.email;
    return (
      <Pressable style={styles.chip} onPress={signOut} accessibilityLabel={`Sign out ${label}`}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{label.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.signOut}>Sign out</Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  signInText: { color: colors.primaryDark, fontWeight: fontWeight.semibold, fontSize: fontSize.base },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: space.xs,
    paddingRight: space.md,
    paddingVertical: space.xs,
  },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#eef2ff" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontWeight: fontWeight.bold, fontSize: fontSize.base },
  signOut: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
});
