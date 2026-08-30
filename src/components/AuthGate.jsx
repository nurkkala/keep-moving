import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Wraps the coach. Shows a sign-in screen until there's a session, then renders
 * children with the signed-in user and a signOut callback.
 *
 *   <AuthGate>{({ user, signOut }) => <ExerciseCoach user={user} onSignOut={signOut} />}</AuthGate>
 */
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-500 grid place-items-center">
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  if (!session) return <SignIn />;

  return children({
    user: session.user,
    signOut: () => supabase.auth.signOut(),
  });
}

function SignIn() {
  const [mode, setMode] = useState("in"); // "in" | "up"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const submit = async () => {
    if (!email || !password) {
      setError("Enter an email and password.");
      return;
    }
    if (mode === "up" && password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    const fn = mode === "in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { data, error: authError } = await fn.call(supabase.auth, { email, password });

    setBusy(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    // Sign-up with email confirmation on returns a user but no session.
    if (mode === "up" && !data.session) {
      setNotice("Check your email for a confirmation link, then sign in.");
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Exercise coach</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {mode === "in" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Your workouts, history, and voice settings follow you to any device.
        </p>

        <div className="mt-7 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDown}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-sm px-3 py-2 text-sm
                         focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Password</span>
            <input
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-sm px-3 py-2 text-sm
                         focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        {notice && <p className="mt-3 text-sm text-cyan-300">{notice}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 w-full bg-cyan-400 text-slate-950 rounded-sm py-2.5 text-sm font-medium
                     hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-xs text-slate-500 hover:text-slate-300"
        >
          {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
