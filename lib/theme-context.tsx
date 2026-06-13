import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, type Palette } from "./theme";

type Scheme = "light" | "dark";

interface ThemeState {
  colors: Palette;
  scheme: Scheme;
  isDark: boolean;
  /** Flip between light and dark (persists an explicit override). */
  toggle: () => void;
}

// Persist the explicit override (web: localStorage). `null` = follow the OS.
const KEY = "themeOverride";
const storage = {
  get(): Scheme | null {
    try {
      const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
      return v === "light" || v === "dark" ? v : null;
    } catch {
      return null;
    }
  },
  set(v: Scheme | null) {
    try {
      if (typeof localStorage === "undefined") return;
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};

const ThemeContext = createContext<ThemeState>({
  colors: lightColors,
  scheme: "light",
  isDark: false,
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme(); // 'light' | 'dark' | null
  const [override, setOverride] = useState<Scheme | null>(null);

  // Restore a saved override on mount (after hydration, to match static render).
  useEffect(() => {
    setOverride(storage.get());
  }, []);

  const scheme: Scheme = override ?? (osScheme === "dark" ? "dark" : "light");
  const isDark = scheme === "dark";

  const value = useMemo<ThemeState>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      scheme,
      isDark,
      toggle: () => {
        const next: Scheme = isDark ? "light" : "dark";
        storage.set(next);
        setOverride(next);
      },
    }),
    [isDark, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
