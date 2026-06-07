import React, { createContext, useContext, useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { loginWithGoogle, type AuthUser } from "./api";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Minimal token/user persistence. Web uses localStorage; native is a later step.
const storage = {
  get(k: string): string | null {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  remove(k: string) {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

interface AuthState {
  user: AuthUser | null;
  configured: boolean; // true when a Google client ID is set
  busy: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  configured: false,
  busy: false,
  error: null,
  signIn: () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  // Restore a persisted session on load.
  useEffect(() => {
    const u = storage.get("authUser");
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Handle the Google sign-in result → exchange for an app session.
  useEffect(() => {
    if (response?.type !== "success") return;
    const accessToken = response.authentication?.accessToken;
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    loginWithGoogle(accessToken)
      .then(({ token, user }) => {
        setUser(user);
        storage.set("authToken", token);
        storage.set("authUser", JSON.stringify(user));
      })
      .catch((e) => setError(e.message ?? "Sign-in failed"))
      .finally(() => setBusy(false));
  }, [response]);

  const signIn = () => {
    if (request) promptAsync();
  };
  const signOut = () => {
    setUser(null);
    storage.remove("authToken");
    storage.remove("authUser");
  };

  return (
    <AuthContext.Provider value={{ user, configured: !!CLIENT_ID, busy, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
