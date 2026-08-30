/**
 * Dark, light, or follow the system.
 *
 * Two stores, deliberately:
 *
 *  - `localStorage` is the source of truth for first paint. The inline script
 *    in index.html reads it before React exists, which is the only way to
 *    avoid a flash of the wrong theme. Keep the two in sync.
 *  - `preferences.theme` is the cross-device copy. It's written best-effort on
 *    every change and read once per session by `syncThemeFromPrefs`, so a new
 *    device adopts your choice on its second paint rather than its first.
 *
 * When they disagree, the stored preference wins and is written back down.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchPrefs, savePrefs } from "./data";

export const THEMES = ["system", "light", "dark"];

const KEY = "km-theme";
const CANVAS = { dark: "#020617", light: "#f8fafc" };

const query = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Never throws: private mode can make localStorage unreadable. */
export function readTheme() {
  try {
    const stored = localStorage.getItem(KEY);
    return THEMES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/** 'system' collapses to whatever the OS currently says. */
export function resolveTheme(theme = readTheme()) {
  if (theme === "light" || theme === "dark") return theme;
  return query().matches ? "dark" : "light";
}

/** Puts the choice on <html>. Idempotent — safe to call on every render. */
export function applyTheme(theme) {
  const dark = resolveTheme(theme) === "dark";
  const root = document.documentElement;

  root.classList.toggle("dark", dark);
  // Drives native controls and form widgets, which CSS variables can't reach.
  root.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? CANVAS.dark : CANVAS.light);
}

function persist(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* Still applied for this tab; it just won't survive a reload. */
  }
}

/**
 * Reads the signed-in preference and adopts it. Call once a session exists.
 * Does nothing if it matches what's already applied, so the common case is
 * free. Returns the theme in effect afterwards.
 */
export async function syncThemeFromPrefs() {
  const local = readTheme();
  try {
    const { theme } = await fetchPrefs();
    if (!THEMES.includes(theme) || theme === local) return local;
    persist(theme);
    applyTheme(theme);
    return theme;
  } catch {
    // Signed out, offline, or the row doesn't exist yet — local stays correct.
    return local;
  }
}

/**
 * The theme control. Writes through to localStorage immediately and to the
 * database best-effort: the local write is what the next paint reads, so a
 * failed sync costs cross-device agreement, not the setting itself.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  // 'system' has to keep tracking the OS while the page is open.
  useEffect(() => {
    const mq = query();
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const choose = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    persist(next);
    applyTheme(next);
    setTheme(next);
    savePrefs({ theme: next }).catch(() => {});
  }, []);

  return [theme, choose];
}
