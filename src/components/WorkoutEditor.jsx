import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus, Search, X } from "lucide-react";
import {
  fetchWorkoutExercises, saveWorkoutExercises, updateWorkout, deleteWorkout,
  fetchExercises, fetchAttributeTypes, describeTarget,
} from "../lib/coachData";
import ExerciseEditor from "./ExerciseEditor";

const DAYS = [
  { n: 0, label: "S", full: "Sunday" },
  { n: 1, label: "M", full: "Monday" },
  { n: 2, label: "T", full: "Tuesday" },
  { n: 3, label: "W", full: "Wednesday" },
  { n: 4, label: "T", full: "Thursday" },
  { n: 5, label: "F", full: "Friday" },
  { n: 6, label: "S", full: "Saturday" },
];

export default function WorkoutEditor({ workout, onBack, onChanged }) {
  const [name, setName] = useState(workout.name);
  const [days, setDays] = useState(workout.days ?? []);
  const [orderMode, setOrderMode] = useState(workout.orderMode ?? "straight");
  const [restSec, setRestSec] = useState(workout.restSec ?? 15);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWorkoutExercises(workout.id)
      .then((rows) => !cancelled && setList(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [workout.id]);

  const move = (from, to) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    setList(next);
    setDirty(true);
  };

  const remove = (i) => {
    setList(list.filter((_, k) => k !== i));
    setDirty(true);
  };

  const add = (exercise) => {
    if (list.some((l) => l.exerciseId === exercise.id)) return;
    setList([
      ...list,
      {
        id: `new-${exercise.id}`,
        exerciseId: exercise.id,
        name: exercise.name,
        kind: exercise.kind,
        targetType: exercise.suggestedType,
        targetValue: exercise.suggestedValue,
        sets: exercise.suggestedSets,
        targetIsPersonal: false,
        note: "",
      },
    ]);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateWorkout(workout.id, { name, days, orderMode, restSec }),
        saveWorkoutExercises(workout.id, list),
      ]);
      setDirty(false);
      onChanged?.();
      onBack();
    } catch (e) {
      setError(e.message ?? "Couldn't save this workout.");
      setSaving(false);
    }
  };

  const removeWorkout = async () => {
    if (!window.confirm(`Delete "${workout.name}"? Past sessions are kept.`)) return;
    try {
      await deleteWorkout(workout.id);
      onChanged?.();
      onBack();
    } catch (e) {
      setError(e.message);
    }
  };

  if (adding) {
    return (
      <ExercisePicker
        exclude={list.map((l) => l.exerciseId)}
        onPick={(ex) => {
          add(ex);
          setAdding(false);
        }}
        onClose={() => setAdding(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-200
                     focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm"
        >
          <ChevronLeft size={15} /> Back
        </button>

        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          className="mt-4 w-full bg-transparent text-3xl font-semibold tracking-tight
                     border-b border-slate-800 pb-1
                     focus:outline-none focus:border-cyan-400"
        />

        {/* ------------------------------------------------------- schedule */}
        <p className="mt-7 text-[11px] uppercase tracking-[0.25em] text-slate-500">Days</p>
        <div className="mt-2 flex gap-1.5">
          {DAYS.map((d) => {
            const on = days.includes(d.n);
            return (
              <button
                key={d.n}
                onClick={() => {
                  setDays(on ? days.filter((x) => x !== d.n) : [...days, d.n].sort());
                  setDirty(true);
                }}
                aria-label={d.full}
                aria-pressed={on}
                className={`flex-1 aspect-square rounded-sm border text-sm
                            focus:outline-none focus:ring-1 focus:ring-cyan-400
                            ${on
                              ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                              : "border-slate-800 text-slate-600 hover:border-slate-600"}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {days.length === 0 && (
          <p className="mt-2 text-xs text-slate-600">
            No days selected — this stays available but never appears under Today.
          </p>
        )}

        {/* ------------------------------------------------------ order mode */}
        <p className="mt-7 text-[11px] uppercase tracking-[0.25em] text-slate-500">Order</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { v: "straight", title: "Straight sets", sub: "All sets, then move on" },
            { v: "circuit", title: "Circuit", sub: "One set each, rotating" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => {
                setOrderMode(o.v);
                setDirty(true);
              }}
              className={`border rounded-sm p-3 text-left focus:outline-none focus:ring-1 focus:ring-cyan-400
                          ${orderMode === o.v
                            ? "border-cyan-400 text-cyan-300"
                            : "border-slate-800 text-slate-400 hover:border-slate-600"}`}
            >
              <span className="block text-sm">{o.title}</span>
              <span className="block text-[11px] text-slate-600 mt-0.5">{o.sub}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
            Rest between sets
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={restSec}
              onChange={(e) => {
                setRestSec(parseInt(e.target.value, 10));
                setDirty(true);
              }}
              className="w-32 accent-cyan-400"
            />
            <span
              className="text-sm text-slate-400 w-10 text-right"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {restSec}s
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------- exercises */}
        <div className="mt-8 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
            Exercises ({list.length})
          </p>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600 border border-dashed border-slate-800 rounded-sm p-6 text-center">
            No exercises yet. Add some from the library.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 border-y border-slate-800">
            {list.map((ex, i) => (
              <li key={ex.id} className="py-2.5 flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move ${ex.name} up`}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:hover:text-slate-600"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === list.length - 1}
                    aria-label={`Move ${ex.name} down`}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:hover:text-slate-600"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <span className="flex-1 text-sm">{ex.name}</span>

                <span
                  className={`text-xs shrink-0 ${
                    ex.targetIsPersonal ? "text-slate-400" : "text-slate-600 italic"
                  }`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {describeTarget(ex)}
                </span>

                <button
                  onClick={() => remove(i)}
                  aria-label={`Remove ${ex.name}`}
                  className="text-slate-700 hover:text-rose-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] text-slate-600">
          Targets are set per exercise, not per workout — tap one in the workout view to change it.
        </p>

        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

        <button
          onClick={save}
          disabled={saving || !dirty}
          className="mt-7 w-full bg-cyan-400 text-slate-950 rounded-sm py-3 font-medium
                     hover:bg-cyan-300 disabled:opacity-40
                     focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
        </button>

        <button
          onClick={removeWorkout}
          className="mt-4 w-full text-xs text-slate-600 hover:text-rose-400"
        >
          Delete this workout
        </button>
      </div>
    </div>
  );
}

/** Browse the shared library, filtered by the tag vocabulary. */
function ExercisePicker({ exclude, onPick, onClose }) {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [axes, setAxes] = useState([]);
  const [active, setActive] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttributeTypes().then(setAxes).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      fetchExercises({ search, valueKeys: active })
        .then((rows) => !cancelled && setResults(rows))
        .finally(() => !cancelled && setLoading(false));
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, active]);

  const toggle = (key) =>
    setActive((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]));

  const condition = axes.find((a) => a.key === "condition");
  const bodyArea = axes.find((a) => a.key === "body_area");

  if (creating) {
    return (
      <ExerciseEditor
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          setSearch("");
          setActive([]);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Add an exercise</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the library"
            className="w-full bg-slate-900 border border-slate-700 rounded-sm pl-9 pr-3 py-2 text-sm
                       placeholder:text-slate-600
                       focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {[bodyArea, condition].filter(Boolean).map((axis) => (
          <div key={axis.key} className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{axis.label}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {axis.values.map((v) => (
                <button
                  key={v.id}
                  onClick={() => toggle(v.key)}
                  className={`text-xs border rounded-sm px-2 py-0.5
                              focus:outline-none focus:ring-1 focus:ring-cyan-400
                              ${active.includes(v.key)
                                ? "border-cyan-400 text-cyan-300"
                                : "border-slate-800 text-slate-500 hover:border-slate-600"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {active.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-600">
            Showing anything matching any selected tag.
          </p>
        )}

        <button
          onClick={() => setCreating(true)}
          className="mt-5 w-full border border-dashed border-slate-800 rounded-sm py-2.5
                     inline-flex items-center justify-center gap-1.5 text-sm text-slate-500
                     hover:border-slate-600 hover:text-slate-300
                     focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <Plus size={13} /> Create your own exercise
        </button>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Searching…</p>
        ) : results.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">Nothing matches those filters.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-800 border-y border-slate-800">
            {results.map((ex) => {
              const already = exclude.includes(ex.id);
              return (
                <li key={ex.id}>
                  <button
                    onClick={() => !already && onPick(ex)}
                    disabled={already}
                    className="w-full text-left py-3 flex items-baseline gap-3
                               hover:bg-slate-900/60 disabled:opacity-40
                               focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <span className="flex-1">
                      <span className="block text-sm">{ex.name}</span>
                      {ex.description && (
                        <span className="block text-xs text-slate-600 mt-0.5 line-clamp-1">
                          {ex.description}
                        </span>
                      )}
                    </span>
                    <span
                      className="text-xs text-slate-500 shrink-0"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {already
                        ? "added"
                        : describeTarget({
                            targetType: ex.suggestedType,
                            targetValue: ex.suggestedValue,
                            sets: ex.suggestedSets,
                          })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
