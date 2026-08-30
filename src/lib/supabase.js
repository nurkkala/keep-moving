import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether the app has credentials to talk to Supabase. App.jsx checks this and
 * shows setup instructions instead of a blank screen.
 *
 * Deliberately NOT a module-scope throw. Vite replaces import.meta.env at
 * build time, so `if (!url) throw` becomes unconditional whenever the vars are
 * absent — and Rollup then prunes every module downstream as unreachable. The
 * build still succeeds and ships a bundle containing nothing but the error.
 * Keep this file free of side effects at import time.
 */
export const isConfigured = Boolean(url && key);

export const supabase = createClient(
  url || "https://unconfigured.invalid",
  key || "unconfigured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
