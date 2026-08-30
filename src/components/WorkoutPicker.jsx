import React, { useEffect, useState } from "react";
import { ChevronLeft, Calendar, AlertCircle } from "lucide-react";
import {
  fetchOrSeedWorkouts,
  fetchWorkoutExercises,
  describeDays,
} from "../lib/coachData";
import ExerciseDetail from "./ExerciseDetail";

const KINDS = {
  stretch: { label: "Stretch", text: "text-cyan-300", bg: "bg-cyan-400" },
  strength: { label: "Strength", text: "text-orange-400", bg: "bg-orange-400" },
  core: { label: "Core", text: "text-violet-300", bg: "bg-violet-400" },
  cardio: { label: "Cardio", text: "text-rose-300", bg: "bg-rose-400" },
};

const minutes = (sec) => `${Math.max(1, Math.round(sec / 60))} min`;

/**
 * The front door: what's on today, everything else below it, and a tap into
 * any workout's exercise list.
 */
export default function WorkoutPicker({ onStart, onSignOut }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchOrSeedWorkouts()
      .then((list) => !cancelled && setWorkouts(list))
      .catch((e) => !cancelled && setError(e.message ?? "Couldn't load your workouts."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  if (openId) {
    const workout = workouts.find((w) => w.id === openId);
    return <WorkoutDetail workout={workout} onBack={() => setOpenId(null)} onStart={onStart} />;
  }

  const today = new Date().getDay();
  const scheduled = workouts.filter((w) => w.days.includes(today));
  const rest = workouts.filter((w) => !w.days.includes(today));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8">
      <div className="max-w-lg mx-auto">
        <header className="flex items-baseline justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today</h1>
          </div>
          {onSignOut && (
            <button onClick={onSignOut} className="text-xs text-slate-500 hover:text-slate-300">
              Sign out
            </button>
          )}
        </header>

        {loading && <p className="mt-8 text-sm text-slate-500">Loading your workouts…</p>}

        {error && (
          <div className="mt-8 border border-rose-900 rounded-sm p-4 flex gap-3">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-rose-300">{error}</p>
              <p className="text-xs text-slate-500 mt-1">
                Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {scheduled.length === 0 ? (
              <div className="mt-6 border border-dashed border-slate-700 rounded-sm p-8 text-center">
                <p className="text-slate-400 text-sm">Nothing scheduled today.</p>
                <p className="text-slate-600 text-xs mt-1">Pick anything below to do it anyway.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {scheduled.map((w) => (
                  <WorkoutCard key={w.id} workout={w} highlight onOpen={() => setOpenId(w.id)} />
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <>
                <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  Other workouts
                </p>
                <div className="mt-3 space-y-3">
                  {rest.map((w) => (
                    <WorkoutCard key={w.id} workout={w} onOpen={() => setOpenId(w.id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WorkoutCard({ workout, highlight, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className={`w-full text-left border rounded-sm p-4 transition-colors
                  focus:outline-none focus:ring-1 focus:ring-cyan-400
                  ${highlight
                    ? "border-slate-600 bg-slate-900 hover:border-cyan-400"
                    : "border-slate-800 hover:border-slate-600"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{workout.name}</span>
        <span
          className="text-sm text-slate-400 shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {workout.exerciseCount} · {minutes(workout.estWorkSec)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} /> {describeDays(workout.days)}
        </span>
      </div>
    </button>
  );
}

function WorkoutDetail({ workout, onBack, onStart }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    if (!workout) return;
    let cancelled = false;

    fetchWorkoutExercises(workout.id)
      .then((rows) => !cancelled && setList(rows))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [workout]);

  if (!workout) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-200
                     focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm"
        >
          <ChevronLeft size={15} /> Today
        </button>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{workout.name}</h1>
        {workout.description && (
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">{workout.description}</p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {describeDays(workout.days)} · {workout.exerciseCount} exercises ·{" "}
          {minutes(workout.estWorkSec)}
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading exercises…</p>
        ) : (
          <ul className="mt-7 divide-y divide-slate-800 border-y border-slate-800">
            {list.map((ex) => {
              const kind = KINDS[ex.kind];
              return (
                <li key={ex.id}>
                  <button
                    onClick={() => setDetailId(ex.exerciseId)}
                    className="w-full text-left py-3 flex items-baseline gap-3
                               hover:bg-slate-900/60 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <span className={`w-1 h-1 rounded-full shrink-0 ${kind?.bg ?? "bg-slate-600"}`} />
                    <span className="flex-1">
                      <span className="block">{ex.name}</span>
                      {ex.cue && (
                        <span className="block text-xs text-slate-500 mt-0.5">{ex.cue}</span>
                      )}
                    </span>
                    <span
                      className="text-sm text-slate-400 shrink-0"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {ex.type === "time" ? `${ex.seconds}s` : `${ex.reps}×`}
                      {ex.sets > 1 && <span className="text-slate-600"> ·{ex.sets}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {onStart && (
          <button
            onClick={() => onStart(workout, list)}
            className="mt-7 w-full bg-cyan-400 text-slate-950 rounded-sm py-3 font-medium
                       hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400
                       focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Start workout
          </button>
        )}
      </div>

      {detailId && (
        <ExerciseDetail exerciseId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}
