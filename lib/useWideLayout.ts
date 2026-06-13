import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";

/**
 * Responsive breakpoint helper that survives static rendering.
 *
 * On web, expo-router pre-renders pages at a default (narrow) viewport, so the
 * shipped HTML has the mobile layout baked in. React hydration is locked to that
 * markup and nothing re-reads window size, so `useWindowDimensions()` alone
 * leaves the page stuck in the narrow layout until a client-side navigation
 * remounts it.
 *
 * This returns `false` on the first (hydration) render — matching the static
 * HTML, so there's no hydration mismatch — then flips a state flag in an effect
 * after mount, forcing one re-render that reads the real width. After that it
 * tracks resizes normally.
 */
export function useWideLayout(breakpoint: number): boolean {
  const { width } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && width >= breakpoint;
}
