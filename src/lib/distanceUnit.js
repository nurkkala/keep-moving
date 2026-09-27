import { useSyncExternalStore } from "react";
import { fetchPrefs } from "./data";

/**
 * The user's distance unit, read once and shared by every screen that shows a
 * distance. Each screen used to fall back to "mi" on its own, so a user who
 * chose kilometers saw miles everywhere except the target sheet.
 *
 * Stored distances are meters regardless; this only decides how they read.
 * The first subscriber triggers the fetch. Every distance renders inside
 * AuthGate, so by then there is a session to read preferences for.
 */
let unit = "mi";
let loading = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  loading ??= fetchPrefs()
    .then((p) => {
      if (p.distanceUnit && p.distanceUnit !== unit) {
        unit = p.distanceUnit;
        emit();
      }
    })
    .catch(() => {
      loading = null; // try again on the next subscriber
    });
  return () => listeners.delete(fn);
}

export function useDistanceUnit() {
  return useSyncExternalStore(subscribe, () => unit);
}

/** Called after the preference is saved, so open screens follow at once. */
export function setDistanceUnit(next) {
  if (next === unit) return;
  unit = next;
  emit();
}
