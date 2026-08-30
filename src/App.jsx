import React, { useState, useCallback } from "react";
import { isConfigured } from "./lib/supabase";
import AuthGate from "./components/AuthGate";
import WorkoutPicker from "./components/WorkoutPicker";
import WorkoutEditor from "./components/WorkoutEditor";
import CoachSession from "./components/CoachSession";
import History from "./components/History";
import EquipmentInventory from "./components/EquipmentInventory";

/**
 * One screen at a time, which suits a phone propped against a wall mid-workout.
 * `key` on the picker forces a refetch when returning from a screen that could
 * have changed targets or the exercise list.
 */
export default function App() {
  const [view, setView] = useState({ name: "today" });
  const [stamp, setStamp] = useState(0);

  const home = useCallback(() => {
    setStamp((n) => n + 1);
    setView({ name: "today" });
  }, []);

  if (!isConfigured) return <NeedsSetup />;

  return (
    <AuthGate>
      {({ signOut }) => {
        if (view.name === "session") {
          return (
            <CoachSession
              workout={view.workout}
              onExit={home}
              onFinished={() => setView({ name: "history" })}
            />
          );
        }

        if (view.name === "edit") {
          return <WorkoutEditor workout={view.workout} onBack={home} onChanged={home} />;
        }

        if (view.name === "history") {
          return <History onBack={home} />;
        }

        if (view.name === "equipment") {
          return <EquipmentInventory onBack={home} />;
        }

        return (
          <WorkoutPicker
            key={stamp}
            onSignOut={signOut}
            onHistory={() => setView({ name: "history" })}
            onEquipment={() => setView({ name: "equipment" })}
            onEdit={(workout) => setView({ name: "edit", workout })}
            onStart={(workout) => setView({ name: "session", workout })}
          />
        );
      }}
    </AuthGate>
  );
}

/** A blank screen tells you nothing. This tells you exactly what's missing. */
function NeedsSetup() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-16">
      <div className="max-w-md mx-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Coach</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Needs configuring</h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          No Supabase credentials found. Copy <code className="text-cyan-300">.env.example</code> to{" "}
          <code className="text-cyan-300">.env.local</code>, paste your anon key from Project
          Settings → API Keys, then restart the dev server — Vite only reads env files at startup.
        </p>
        <pre className="mt-5 text-xs bg-slate-900 border border-slate-800 rounded-sm p-3 overflow-x-auto text-slate-400">
{`VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>`}
        </pre>
      </div>
    </div>
  );
}
