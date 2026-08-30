import React, { useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import {
  setExerciseTarget, clearExerciseTarget, describeTarget,
  fetchPrefs, toMetres, fromMetres,
} from "../lib/data";

/**
 * Sets what this user is aiming for on one exercise. A target is state, not a
 * log — this overwrites. The record of what was actually done lives in session
 * history and isn't touched by anything here.
 */
export default function TargetSheet({ exercise, onClose, onSaved }) {
  const [targetType, setTargetType] = useState(exercise.targetType ?? "time");
  const [targetValue, setTargetValue] = useState(exercise.targetValue ?? 30);
  const [sets, setSets] = useState(exercise.sets ?? 1);
  const [note, setNote] = useState("");
  const [unit, setUnit] = useState("mi");

  useEffect(() => {
    fetchPrefs().then((p) => setUnit(p.distanceUnit)).catch(() => {});
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!targetValue || targetValue < 1) {
      setError("Give it a number above zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setExerciseTarget(exercise.exerciseId, { targetType, targetValue, sets, note });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message ?? "Couldn't save that target.");
      setBusy(false);
    }
  };

  const revert = async () => {
    setBusy(true);
    setError(null);
    try {
      await clearExerciseTarget(exercise.exerciseId);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message ?? "Couldn't clear that target.");
      setBusy(false);
    }
  };

  const step = targetType === "time" ? 5 : 1;
  const label =
    targetType === "time" ? "seconds" : targetType === "distance" ? unit : "reps";

  return (
    <div
      className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Target for ${exercise.name}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-surface border-t sm:border border-line-hi
                   sm:rounded-sm px-5 pb-8 pt-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">Your target</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{exercise.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-subtle hover:text-ink-soft p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <X size={18} />
          </button>
        </div>

        {!exercise.targetIsPersonal && (
          <p className="mt-3 text-xs text-subtle">
            Currently on the library's suggestion of{" "}
            {describeTarget(exercise, { long: true, unit })}. Saving makes it yours.
          </p>
        )}

        {/* Measured by duration or by count — never both. */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { v: "time", label: "Time" },
            { v: "reps", label: "Reps" },
            { v: "distance", label: "Distance" },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTargetType(t.v)}
              className={`border rounded-sm py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent
                          ${targetType === t.v
                            ? "border-accent text-accent-hi"
                            : "border-line-hi text-muted hover:border-line-hi3"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {targetType === "distance" ? (
          <label className="block mt-5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">
              Distance in {label}
            </span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={fromMetres(targetValue, unit)}
              onChange={(e) =>
                setTargetValue(toMetres(parseFloat(e.target.value) || 0, unit))
              }
              className="mt-1 w-full bg-canvas border border-line-hi rounded-sm px-3 py-2 text-sm
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
            <span className="block mt-1 text-[11px] text-faint">
              Stored as {targetValue} m, so switching units never rewrites history.
            </span>
          </label>
        ) : (
          <Stepper
            label={label}
            value={targetValue}
            step={step}
            min={1}
            onChange={setTargetValue}
          />
        )}
        <Stepper label="sets" value={sets} step={1} min={1} max={10} onChange={setSets} />

        <label className="block mt-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">
            Why (optional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Felt easy at 45"
            className="mt-1 w-full bg-canvas border border-line-hi rounded-sm px-3 py-2 text-sm
                       placeholder:text-ghost
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button
          onClick={save}
          disabled={busy}
          className="mt-6 w-full bg-accent text-on-accent rounded-sm py-2.5 text-sm font-medium
                     hover:bg-accent-hi disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas"
        >
          {busy ? "Saving…" : "Save target"}
        </button>

        {exercise.targetIsPersonal && (
          <button
            onClick={revert}
            disabled={busy}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs
                       text-subtle hover:text-ink-dim disabled:opacity-50"
          >
            <RotateCcw size={12} /> Back to the suggested target
          </button>
        )}

        <p className="mt-4 text-[11px] text-faint leading-relaxed">
          Changing this doesn't touch your history. Past sessions keep the target they were
          measured against.
        </p>
      </div>
    </div>
  );
}

function Stepper({ label, value, step, min = 1, max = 999, onChange }) {
  const clamp = (n) => Math.min(max, Math.max(min, n));

  return (
    <div className="mt-5 flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.2em] text-subtle">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
          className="w-9 h-9 border border-line-hi rounded-sm text-muted
                     hover:text-ink hover:border-line-hi3
                     focus:outline-none focus:ring-1 focus:ring-accent"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || min))}
          className="w-16 bg-canvas border border-line-hi rounded-sm px-2 py-1.5 text-center
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          style={{ fontVariantNumeric: "tabular-nums" }}
        />
        <button
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
          className="w-9 h-9 border border-line-hi rounded-sm text-muted
                     hover:text-ink hover:border-line-hi3
                     focus:outline-none focus:ring-1 focus:ring-accent"
        >
          +
        </button>
      </div>
    </div>
  );
}
