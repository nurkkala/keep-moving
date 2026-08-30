import React, { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, Calendar, Repeat, AlertCircle, Pencil, Plus, Clock3,
  AlertTriangle, Package,
} from "lucide-react";
import {
  fetchOrSeedWorkouts,
  fetchWorkoutExercises,
  fetchWorkoutEquipment,
  createWorkout,
  describeDays,
  describeTarget,
  describeOrderMode,
} from "../lib/coachData";
import ExerciseDetail from "./ExerciseDetail";
import TargetSheet from "./TargetSheet";
import ExerciseEditor from "./ExerciseEditor";

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
export default function WorkoutPicker({ onStart, onEdit, onHistory, onEquipment, onSignOut }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const reload = useCallback(
    () =>
      fetchOrSeedWorkouts()
        .then(setWorkouts)
        .catch((e) => setError(e.message ?? "Couldn't load your workouts."))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    reload();
  }, [reload]);

  if (openId) {
    const workout = workouts.find((w) => w.id === openId);
    return (
      <WorkoutDetail
        workout={workout}
        onBack={() => setOpenId(null)}
        onStart={onStart}
        onEdit={onEdit}
        onTargetChanged={reload}
      />
    );
  }

  const addWorkout = async () => {
    const name = window.prompt("Name this workout", "New workout");
    if (!name?.trim()) return;
    try {
      const id = await createWorkout({ name: name.trim(), days: [] });
      await reload();
      onEdit?.({ id, name: name.trim(), days: [], orderMode: "straight", restSec: 15 });
    } catch (e) {
      setError(e.message);
    }
  };

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
          <div className="flex items-center gap-3">
            {onEquipment && (
              <button
                onClick={onEquipment}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
              >
                <Package size={12} /> Kit
              </button>
            )}
            {onHistory && (
              <button
                onClick={onHistory}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
              >
                <Clock3 size={12} /> History
              </button>
            )}
            {onSignOut && (
              <button onClick={onSignOut} className="text-xs text-slate-500 hover:text-slate-300">
                Sign out
              </button>
            )}
          </div>
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

            <button
              onClick={addWorkout}
              className="mt-6 w-full border border-dashed border-slate-800 rounded-sm py-3
                         inline-flex items-center justify-center gap-1.5 text-sm text-slate-500
                         hover:border-slate-600 hover:text-slate-300
                         focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <Plus size={14} /> New workout
            </button>

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
        {workout.orderMode === "circuit" && (
          <span className="inline-flex items-center gap-1">
            <Repeat size={11} /> {describeOrderMode(workout.orderMode)}
          </span>
        )}
        {workout.missingEquipment > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-400/80">
            <AlertTriangle size={11} /> missing kit
          </span>
        )}
      </div>
    </button>
  );
}

function WorkoutDetail({ workout, onBack, onStart, onEdit, onTargetChanged }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [targetFor, setTargetFor] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [equipment, setEquipment] = useState([]);

  const reloadList = useCallback(() => {
    if (!workout) return Promise.resolve();
    return fetchWorkoutExercises(workout.id)
      .then(setList)
      .finally(() => setLoading(false));
  }, [workout]);

  useEffect(() => {
    reloadList();
    if (workout) fetchWorkoutEquipment(workout.id).then(setEquipment).catch(() => {});
  }, [reloadList, workout]);

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
          {minutes(workout.estWorkSec)} · {describeOrderMode(workout.orderMode)}
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading exercises…</p>
        ) : (
          <ul className="mt-7 divide-y divide-slate-800 border-y border-slate-800">
            {list.map((ex) => {
              const kind = KINDS[ex.kind];
              return (
                <li key={ex.id} className="flex items-baseline gap-3 py-3">
                  <button
                    onClick={() => setDetailId(ex.exerciseId)}
                    className="flex-1 text-left flex items-baseline gap-3
                               hover:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <span className={`w-1 h-1 rounded-full shrink-0 ${kind?.bg ?? "bg-slate-600"}`} />
                    <span className="flex-1">
                      <span className="block">{ex.name}</span>
                      {ex.cue && (
                        <span className="block text-xs text-slate-500 mt-0.5">{ex.cue}</span>
                      )}
                    </span>
                  </button>

                  <button
                    onClick={() => setTargetFor(ex)}
                    title={
                      ex.targetIsPersonal
                        ? "Your target — tap to change"
                        : "Suggested — tap to make it yours"
                    }
                    className={`text-sm shrink-0 border-b border-dashed
                                hover:text-cyan-300 hover:border-cyan-400
                                focus:outline-none focus:ring-1 focus:ring-cyan-400
                                ${ex.targetIsPersonal
                                  ? "text-slate-400 border-slate-700"
                                  : "text-slate-600 italic border-slate-800"}`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {describeTarget(ex)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {equipment.length > 0 && (
          <div className="mt-6 border border-slate-800 rounded-sm p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
              What you'll need
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {equipment.map((eq) => (
                <span
                  key={eq.id}
                  title={`Used by ${eq.usedBy} ${eq.usedBy === 1 ? "exercise" : "exercises"}`}
                  className={`text-xs border rounded-sm px-2 py-0.5
                              ${eq.owned
                                ? "border-slate-700 text-slate-300"
                                : "border-amber-800 text-amber-300"}`}
                >
                  {eq.label}
                  {!eq.owned && " — don't have"}
                </span>
              ))}
            </div>
            {equipment.some((e) => !e.owned) && (
              <p className="mt-2 text-[11px] text-slate-500">
                Tap an exercise to see what you could do instead.
              </p>
            )}
          </div>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(workout)}
            className="mt-6 w-full border border-slate-800 rounded-sm py-2.5
                       inline-flex items-center justify-center gap-1.5 text-sm text-slate-400
                       hover:border-slate-600 hover:text-slate-200
                       focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <Pencil size={13} /> Edit workout
          </button>
        )}

        {onStart && (
          <button
            onClick={() => onStart(workout)}
            className="mt-3 w-full bg-cyan-400 text-slate-950 rounded-sm py-3 font-medium
                       hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400
                       focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Start workout
          </button>
        )}
      </div>

      {detailId && (
        <ExerciseDetail
          exerciseId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(exercise) => {
            setDetailId(null);
            setEditingExercise(exercise);
          }}
        />
      )}

      {editingExercise && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
          <ExerciseEditor
            exercise={editingExercise}
            onClose={() => setEditingExercise(null)}
            onSaved={reloadList}
          />
        </div>
      )}

      {targetFor && (
        <TargetSheet
          exercise={targetFor}
          onClose={() => setTargetFor(null)}
          onSaved={() => {
            reloadList();
            onTargetChanged?.();
          }}
        />
      )}
    </div>
  );
}
