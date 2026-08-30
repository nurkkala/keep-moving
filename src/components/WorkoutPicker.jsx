import React, { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, Calendar, Repeat, AlertCircle, Pencil, Plus, Clock3,
  AlertTriangle, Package, Library,
} from "lucide-react";
import {
  fetchOrSeedWorkouts,
  fetchWorkoutExercises,
  fetchWorkoutEquipment,
  fetchAvailability,
  fetchEquipmentByWorkout,
  createWorkout,
  describeDays,
  describeTarget,
  describeOrderMode,
} from "../lib/data";
import ExerciseDetail from "./ExerciseDetail";
import TargetSheet from "./TargetSheet";
import ThemeToggle from "./ThemeToggle";
import ExerciseEditor from "./ExerciseEditor";
import KindBadge from "./KindBadge";
import EquipmentNote from "./EquipmentNote";
import { PromptDialog } from "./Dialog";

const minutes = (sec) => `${Math.max(1, Math.round(sec / 60))} min`;

/* `py-1.5` is what lifts these off a 16px tap target. */
const NAV_LINK =
  "inline-flex items-center gap-1 py-1.5 text-xs text-subtle rounded-sm " +
  "hover:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent";

/**
 * The front door: what's on today, everything else below it, and a tap into
 * any workout's exercise list.
 */
export default function WorkoutPicker({ onStart, onEdit, onHistory, onEquipment, onLibrary, onSignOut }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [kitByWorkout, setKitByWorkout] = useState({});
  const [naming, setNaming] = useState(false);

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
    fetchEquipmentByWorkout().then(setKitByWorkout).catch(() => {});
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

  const addWorkout = async (name) => {
    setNaming(false);
    try {
      const id = await createWorkout({ name, days: [] });
      await reload();
      onEdit?.({ id, name, days: [], orderMode: "straight", restSec: 15 });
    } catch (e) {
      setError(e.message);
    }
  };

  const today = new Date().getDay();
  const scheduled = workouts.filter((w) => w.days.includes(today));
  const rest = workouts.filter((w) => !w.days.includes(today));

  return (
    <div className="min-h-screen bg-canvas text-ink px-5 py-8 sm:px-8 lg:py-14">
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        {/* Five controls don't fit beside a heading at 320px — they ran 86px
            past the edge. The nav wraps under the title on a phone and sits
            beside it once there's room. */}
        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <ThemeToggle />
              {onLibrary && (
                <button onClick={onLibrary} className={NAV_LINK}>
                  <Library size={13} /> Exercises
                </button>
              )}
              {onEquipment && (
                <button onClick={onEquipment} className={NAV_LINK}>
                  <Package size={13} /> Kit
                </button>
              )}
              {onHistory && (
                <button onClick={onHistory} className={NAV_LINK}>
                  <Clock3 size={13} /> History
                </button>
              )}
              {onSignOut && (
                <button onClick={onSignOut} className={NAV_LINK}>
                  Sign out
                </button>
              )}
            </nav>
          </div>
        </header>

        {loading && <p className="mt-8 text-sm text-subtle">Loading your workouts…</p>}

        {error && (
          <div className="mt-8 border border-danger-deep rounded-sm p-4 flex gap-3">
            <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-danger-hi">{error}</p>
              <p className="text-xs text-subtle mt-1">
                Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {scheduled.length === 0 ? (
              <div className="mt-6 border border-dashed border-line-hi rounded-sm p-8 text-center">
                <p className="text-muted text-sm">Nothing scheduled today.</p>
                <p className="text-faint text-xs mt-1">Pick anything below to do it anyway.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {scheduled.map((w) => (
                  <WorkoutCard key={w.id} workout={w} kit={kitByWorkout[w.id]} highlight onOpen={() => setOpenId(w.id)} />
                ))}
              </div>
            )}

            <button
              onClick={() => setNaming(true)}
              className="mt-6 w-full border border-dashed border-line rounded-sm py-3
                         inline-flex items-center justify-center gap-1.5 text-sm text-subtle
                         hover:border-line-hi2 hover:text-ink-dim
                         focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <Plus size={14} /> New workout
            </button>

            {rest.length > 0 && (
              <>
                <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-subtle">
                  Other workouts
                </p>
                <div className="mt-3 space-y-3">
                  {rest.map((w) => (
                    <WorkoutCard key={w.id} workout={w} kit={kitByWorkout[w.id]} onOpen={() => setOpenId(w.id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {naming && (
        <PromptDialog
          title="New workout"
          label="Name"
          defaultValue="New workout"
          confirmLabel="Create"
          onSubmit={addWorkout}
          onCancel={() => setNaming(false)}
        />
      )}
    </div>
  );
}

function WorkoutCard({ workout, highlight, onOpen, kit = [] }) {
  // Name what's short rather than saying "missing kit" and making you open the
  // workout to find out which thing it meant.
  const short = kit.filter((k) => !k.owned).map((k) => k.label);
  return (
    <button
      onClick={onOpen}
      className={`w-full text-left border rounded-sm p-4 transition-colors
                  focus:outline-none focus:ring-1 focus:ring-accent
                  ${highlight
                    ? "border-line-hi2 bg-surface hover:border-accent"
                    : "border-line hover:border-line-hi2"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{workout.name}</span>
        <span
          className="text-sm text-muted shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {workout.exerciseCount} · {minutes(workout.estWorkSec)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} /> {describeDays(workout.days)}
        </span>
        {workout.orderMode === "circuit" && (
          <span className="inline-flex items-center gap-1">
            <Repeat size={11} /> {describeOrderMode(workout.orderMode)}
          </span>
        )}
        {(short.length > 0 || workout.missingEquipment > 0) && (
          <span className="inline-flex items-center gap-1 text-warn-hi">
            <AlertTriangle size={11} className="shrink-0" />
            {short.length > 0
              ? `no ${short.join(", no ").toLowerCase()}`
              : "missing kit"}
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
  // Keyed by exercise id, covering the whole library in one request — cheaper
  // than asking per row, and the rows need it to say what they need.
  const [availability, setAvailability] = useState({});

  const reloadList = useCallback(() => {
    if (!workout) return Promise.resolve();
    return fetchWorkoutExercises(workout.id)
      .then(setList)
      .finally(() => setLoading(false));
  }, [workout]);

  useEffect(() => {
    reloadList();
    fetchAvailability().then(setAvailability).catch(() => {});
    if (workout) fetchWorkoutEquipment(workout.id).then(setEquipment).catch(() => {});
  }, [reloadList, workout]);

  if (!workout) return null;

  return (
    <div className="min-h-screen bg-canvas text-ink px-5 py-8 sm:px-8 lg:py-14">
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink-soft
                     focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
        >
          <ChevronLeft size={15} /> Today
        </button>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{workout.name}</h1>
        {workout.description && (
          <p className="mt-2 text-sm text-muted leading-relaxed">{workout.description}</p>
        )}
        <p className="mt-2 text-xs text-subtle">
          {describeDays(workout.days)} · {workout.exerciseCount} exercises ·{" "}
          {minutes(workout.estWorkSec)} · {describeOrderMode(workout.orderMode)}
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-subtle">Loading exercises…</p>
        ) : (
          <ul className="mt-7 divide-y divide-line border-y border-line">
            {list.map((ex) => (
              <li key={ex.id} className="flex items-start gap-3 py-3">
                <button
                  onClick={() => setDetailId(ex.exerciseId)}
                  className="flex-1 text-left flex items-start gap-3
                             hover:text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <KindBadge kind={ex.kind} className="mt-0.5" />
                  <span className="flex-1">
                    <span className="block">{ex.name}</span>
                    {ex.cue && (
                      <span className="block text-xs text-subtle mt-0.5">{ex.cue}</span>
                    )}
                    {/* What it needs, in the row — so you don't have to open
                        each exercise to find which one wants the band. */}
                    <EquipmentNote
                      availability={availability[ex.exerciseId]}
                      className="mt-1"
                    />
                  </span>
                </button>

                <button
                  onClick={() => setTargetFor(ex)}
                  title={
                    ex.targetIsPersonal
                      ? "Your target — tap to change"
                      : "Suggested — tap to make it yours"
                  }
                  className={`text-sm shrink-0 border-b border-dashed mt-0.5
                              hover:text-accent-hi hover:border-accent
                              focus:outline-none focus:ring-1 focus:ring-accent
                              ${ex.targetIsPersonal
                                ? "text-muted border-line-hi"
                                : "text-faint italic border-line"}`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {describeTarget(ex)}
                </button>
              </li>
            ))}
          </ul>
        )}

        {equipment.length > 0 && (
          <div className="mt-6 border border-line rounded-sm p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
              What you'll need
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {equipment.map((eq) => (
                <span
                  key={eq.id}
                  title={`Used by ${eq.usedBy} ${eq.usedBy === 1 ? "exercise" : "exercises"}`}
                  className={`text-xs border rounded-sm px-2 py-0.5
                              ${eq.owned
                                ? "border-line-hi text-ink-dim"
                                : "border-warn-edge text-warn-hi"}`}
                >
                  {eq.label}
                  {!eq.owned && " — don't have"}
                </span>
              ))}
            </div>
            {equipment.some((e) => !e.owned) && (
              <p className="mt-2 text-[11px] text-subtle">
                Tap an exercise to see what you could do instead.
              </p>
            )}
          </div>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(workout)}
            className="mt-6 w-full border border-line rounded-sm py-2.5
                       inline-flex items-center justify-center gap-1.5 text-sm text-muted
                       hover:border-line-hi2 hover:text-ink-soft
                       focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <Pencil size={13} /> Edit workout
          </button>
        )}

        {onStart && (
          <button
            onClick={() => onStart(workout)}
            className="mt-3 w-full bg-accent text-on-accent rounded-sm py-3 font-medium
                       hover:bg-accent-hi focus:outline-none focus:ring-2 focus:ring-accent
                       focus:ring-offset-2 focus:ring-offset-canvas"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas">
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
