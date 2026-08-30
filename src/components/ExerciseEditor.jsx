import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import {
  createExercise, updateExercise, deleteExercise, setExerciseTags,
  fetchAttributeTypes,
} from "../lib/data";

const KINDS = [
  { v: "stretch", label: "Stretch" },
  { v: "strength", label: "Strength" },
  { v: "core", label: "Core" },
  { v: "cardio", label: "Cardio" },
];

/**
 * Creates or edits an exercise the user owns. Built-in exercises are shared
 * and read-only — RLS rejects a write, so this never opens on one.
 *
 * The numbers here are a *suggestion*: a starting point for someone who has
 * never done this. A user's own target is set separately, in TargetSheet.
 */
export default function ExerciseEditor({ exercise, onClose, onSaved }) {
  const isNew = !exercise?.id;

  const [name, setName] = useState(exercise?.name ?? "");
  const [kind, setKind] = useState(exercise?.kind ?? "stretch");
  const [description, setDescription] = useState(exercise?.description ?? "");
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "");
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? "");
  const [suggestedType, setSuggestedType] = useState(exercise?.suggestedType ?? "time");
  const [suggestedValue, setSuggestedValue] = useState(exercise?.suggestedValue ?? 30);
  const [suggestedSets, setSuggestedSets] = useState(exercise?.suggestedSets ?? 1);

  const [axes, setAxes] = useState([]);
  const [selected, setSelected] = useState(
    new Set(Object.values(exercise?.attributes ?? {}).flat().map((v) => v.id))
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAttributeTypes().then(setAxes).catch(() => {});
  }, []);

  const toggleTag = (axis, valueId) => {
    const next = new Set(selected);
    if (next.has(valueId)) {
      next.delete(valueId);
    } else {
      // Single-valued axes (difficulty) replace rather than accumulate.
      if (!axis.multiValued) axis.values.forEach((v) => next.delete(v.id));
      next.add(valueId);
    }
    setSelected(next);
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Give it a name.");
      return;
    }
    if (videoUrl && !/^https?:\/\//.test(videoUrl)) {
      setError("A video link needs to start with http:// or https://");
      return;
    }
    if (!suggestedValue || suggestedValue < 1) {
      setError("The suggested amount needs to be above zero.");
      return;
    }

    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      kind,
      description: description.trim(),
      instructions: instructions.trim(),
      videoUrl: videoUrl.trim(),
      suggestedType,
      suggestedValue,
      suggestedSets,
    };

    try {
      if (isNew) {
        await createExercise(payload, [...selected]);
      } else {
        await updateExercise(exercise.id, payload);
        await setExerciseTags(exercise.id, [...selected]);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message ?? "Couldn't save that.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${name}"? It's removed from any workout using it.`)) return;
    setBusy(true);
    try {
      await deleteExercise(exercise.id);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink px-5 py-8 sm:px-8 lg:py-14">
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
              {isNew ? "New exercise" : "Edit exercise"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {name || "Untitled"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-subtle hover:text-ink-soft p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <X size={18} />
          </button>
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bird dog"
            className={inputClass}
          />
        </Field>

        <div className="mt-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">Category</span>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.v}
                onClick={() => setKind(k.v)}
                className={`border rounded-sm py-1.5 text-xs
                            focus:outline-none focus:ring-1 focus:ring-accent
                            ${kind === k.v
                              ? "border-accent text-accent-hi"
                              : "border-line text-subtle hover:border-line-hi2"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="How to do it — the coach says this aloud">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder="Ten each side, hold five seconds at the top."
            className={inputClass}
          />
        </Field>
        <p className="mt-1 text-[11px] text-faint">
          Hold times and per-side counts go here, not in the numbers below — the coach speaks them
          and doesn't count them.
        </p>

        <Field label="About (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Anti-rotation core work. Keep the hips square to the floor."
            className={inputClass}
          />
        </Field>

        <Field label="Video link (optional)">
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className={inputClass}
          />
        </Field>

        {/* --------------------------------------------------- suggestion */}
        <p className="mt-7 text-[11px] uppercase tracking-[0.25em] text-subtle">
          Suggested starting point
        </p>
        <p className="mt-1 text-[11px] text-faint">
          What a newcomer should try. Not your target — set that separately.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { v: "time", label: "Time" },
            { v: "reps", label: "Reps" },
            { v: "distance", label: "Distance" },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setSuggestedType(t.v)}
              className={`border rounded-sm py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent
                          ${suggestedType === t.v
                            ? "border-accent text-accent-hi"
                            : "border-line text-muted hover:border-line-hi2"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">
              {suggestedType === "time"
                ? "Seconds"
                : suggestedType === "distance"
                ? "Metres"
                : "Reps"}
            </span>
            <input
              type="number"
              min="1"
              value={suggestedValue}
              onChange={(e) => setSuggestedValue(parseInt(e.target.value, 10) || 1)}
              className={inputClass}
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">Sets</span>
            <input
              type="number"
              min="1"
              max="10"
              value={suggestedSets}
              onChange={(e) => setSuggestedSets(parseInt(e.target.value, 10) || 1)}
              className={inputClass}
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
          </label>
        </div>

        {/* --------------------------------------------------------- tags */}
        {axes.map((axis) => (
          <div key={axis.key} className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
              {axis.label}
              {!axis.multiValued && <span className="text-ghost"> · pick one</span>}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {axis.values.map((v) => (
                <button
                  key={v.id}
                  onClick={() => toggleTag(axis, v.id)}
                  className={`text-xs border rounded-sm px-2 py-0.5
                              focus:outline-none focus:ring-1 focus:ring-accent
                              ${selected.has(v.id)
                                ? "border-accent text-accent-hi"
                                : "border-line text-subtle hover:border-line-hi2"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="mt-5 text-sm text-danger">{error}</p>}

        <button
          onClick={save}
          disabled={busy}
          className="mt-7 w-full bg-accent text-on-accent rounded-sm py-3 font-medium
                     hover:bg-accent-hi disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas"
        >
          {busy ? "Saving…" : isNew ? "Create exercise" : "Save changes"}
        </button>

        {!isNew && (
          <button
            onClick={remove}
            disabled={busy}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-xs
                       text-faint hover:text-danger disabled:opacity-50"
          >
            <Trash2 size={12} /> Delete this exercise
          </button>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 w-full bg-surface border border-line-hi rounded-sm px-3 py-2 text-sm " +
  "placeholder:text-ghost focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent";

function Field({ label, children }) {
  return (
    <label className="block mt-5">
      <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">{label}</span>
      {children}
    </label>
  );
}
