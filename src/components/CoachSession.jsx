import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Pause, SkipForward, Check, Mic, MicOff, X, Minus, Plus, Volume2,
} from "lucide-react";
import {
  fetchWorkoutSequence, fetchPrefs, saveSession, describeTarget,
} from "../lib/coachData";
import {
  createSpeaker, createListener, whenVoicesReady, RECOGNITION_SUPPORTED,
} from "../lib/speech";

const KINDS = {
  stretch: { label: "Stretch", text: "text-cyan-300", ring: "stroke-cyan-400" },
  strength: { label: "Strength", text: "text-orange-400", ring: "stroke-orange-400" },
  core: { label: "Core", text: "text-violet-300", ring: "stroke-violet-400" },
  cardio: { label: "Cardio", text: "text-rose-300", ring: "stroke-rose-400" },
};

/** "Plank, 45 seconds" / "Push ups, 10 reps, set 2 of 3" */
function announce(step) {
  const target = describeTarget(step, { long: true });
  const setPart = step.totalSets > 1 ? `, set ${step.setNumber} of ${step.totalSets}` : "";
  return `${step.name}, ${target}${setPart}`;
}

export default function CoachSession({ workout, onExit, onFinished }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("ready"); // ready | work | rest | complete
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [listening, setListening] = useState(false);
  const [log, setLog] = useState([]);
  const [saving, setSaving] = useState(false);

  // For reps: what the user is about to log. Starts at target, adjustable.
  const [repCount, setRepCount] = useState(null);

  const speakerRef = useRef(null);
  const listenerRef = useRef(null);
  const speakingRef = useRef(false);
  const firedRef = useRef(new Set());
  const startedAtRef = useRef(Date.now());

  const step = steps[idx] ?? null;
  const restSec = workout?.restSec ?? 15;

  /* ------------------------------------------------------------ load + voice */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sequence, prefs] = await Promise.all([
          fetchWorkoutSequence(workout.id),
          fetchPrefs(),
        ]);
        if (cancelled) return;

        if (!sequence.length) {
          setError("This workout has no exercises yet.");
          setLoading(false);
          return;
        }

        await whenVoicesReady();
        if (cancelled) return;

        speakerRef.current = createSpeaker({
          voiceURI: prefs.voiceURI,
          rate: prefs.rate,
          onSpeakingChange: (on) => {
            speakingRef.current = on;
          },
        });

        setSteps(sequence);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e.message ?? "Couldn't load this workout.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      speakerRef.current?.stop();
      listenerRef.current?.stop();
    };
  }, [workout.id]);

  const speak = useCallback((text, interrupt = false) => {
    speakerRef.current?.speak(text, interrupt);
  }, []);

  /* ------------------------------------------------------------------ timing */

  useEffect(() => {
    if (paused || phase === "complete" || loading) return;
    const id = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(id);
  }, [paused, phase, loading]);

  const goPhase = useCallback((next) => {
    firedRef.current = new Set();
    setElapsed(0);
    setPhase(next);
  }, []);

  /* ---------------------------------------------------- recording + advancing */

  const closeOut = useCallback(
    (how, actualOverride) => {
      if (!step) return;

      const seconds = Math.round(elapsed / 1000);
      const skipped = how === "skipped";

      const entry = {
        exerciseId: step.exerciseId,
        name: step.name,
        kind: step.kind,
        setNumber: step.setNumber,
        targetType: step.targetType,
        targetValue: step.targetValue,
        targetSets: step.totalSets,
        // Performance in the target's own unit.
        actualValue: skipped
          ? 0
          : step.targetType === "time"
          ? seconds
          : actualOverride ?? step.targetValue,
        actualSec: skipped ? 0 : seconds,
        skipped,
        how,
      };

      const next = [...log, entry];
      setLog(next);
      setRepCount(null);

      if (idx >= steps.length - 1) {
        goPhase("complete");
        speak(
          `Done. ${next.filter((e) => !e.skipped).length} sets, ${Math.round(
            next.reduce((s, e) => s + e.actualSec, 0) / 60
          )} minutes of work.`,
          true
        );
        return;
      }

      setIdx(idx + 1);
      goPhase(restSec > 0 ? "rest" : "work");
    },
    [step, elapsed, log, idx, steps.length, restSec, goPhase, speak]
  );

  /* ------------------------------------------------------- cues + transitions */

  useEffect(() => {
    if (loading || paused || phase === "complete" || !step) return;

    const fire = (key, fn) => {
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);
      fn();
    };
    const countdown = (remaining) => {
      [3, 2, 1].forEach((n) => {
        if (remaining <= n * 1000) fire(`c${n}`, () => speak(String(n)));
      });
    };

    if (phase === "ready") {
      const target = 5000;
      fire("start", () => speak(`Get ready. First up, ${announce(step)}.`, true));
      countdown(target - elapsed);
      if (elapsed >= target) {
        speak("Begin.", true);
        goPhase("work");
      }
      return;
    }

    if (phase === "rest") {
      const target = restSec * 1000;
      fire("start", () => speak(`Rest. Next, ${announce(step)}.`, true));
      countdown(target - elapsed);
      if (elapsed >= target) {
        speak("Begin.", true);
        goPhase("work");
      }
      return;
    }

    // work
    fire("start", () => {
      const tail = step.targetType === "reps" ? " Say done when you finish." : "";
      speak(`${announce(step)}. ${step.cue || ""}${tail}`, true);
      if (step.targetType === "reps") setRepCount(step.targetValue);
    });

    if (step.targetType === "time") {
      const target = step.targetValue * 1000;
      if (step.targetValue >= 25) fire("half", () => speak("Halfway."));
      countdown(target - elapsed);
      if (elapsed >= target) closeOut("timer");
    } else if (elapsed > 90000) {
      fire("check", () => speak("Still going? Say done when you finish."));
    }
  }, [phase, elapsed, step, paused, loading, restSec, speak, goPhase, closeOut]);

  /* --------------------------------------------------------------- listening */

  const handleCommand = useCallback(
    (cmd) => {
      if (cmd.type === "pause") return setPaused(true);
      if (cmd.type === "resume") return setPaused(false);
      if (paused) return;

      if (cmd.type === "repeat" && step) return speak(announce(step), true);
      if (cmd.type === "skip") return closeOut("skipped");
      if (cmd.type === "done") return closeOut("voice", repCount);

      // A bare number during a rep set logs a shortfall without tapping.
      if (cmd.type === "count" && step?.targetType === "reps" && phase === "work") {
        setRepCount(cmd.value);
        speak(`${cmd.value}.`);
      }
    },
    [paused, step, phase, repCount, closeOut, speak]
  );

  const commandRef = useRef(handleCommand);
  commandRef.current = handleCommand;

  const toggleListening = useCallback(() => {
    if (listening) {
      listenerRef.current?.stop();
      listenerRef.current = null;
      setListening(false);
      return;
    }

    const listener = createListener({
      onCommand: (cmd) => commandRef.current(cmd),
      isMuted: () => speakingRef.current,
    });
    if (!listener) return;

    listener.start();
    listenerRef.current = listener;
    setListening(true);
  }, [listening]);

  /* -------------------------------------------------------------------- save */

  const finish = useCallback(async () => {
    setSaving(true);
    try {
      await saveSession({
        totalSec: Math.round((Date.now() - startedAtRef.current) / 1000),
        items: log,
        workoutId: workout.id,
        orderMode: workout.orderMode,
      });
      onFinished?.();
    } catch (e) {
      setError(e.message ?? "Couldn't save this session.");
      setSaving(false);
    }
  }, [log, workout, onFinished]);

  /* ------------------------------------------------------------------ render */

  const progress = useMemo(() => {
    if (!step) return 0;
    if (phase === "rest") return Math.min(1, elapsed / (restSec * 1000));
    if (phase === "ready") return Math.min(1, elapsed / 5000);
    if (step.targetType === "time") return Math.min(1, elapsed / (step.targetValue * 1000));
    return 0; // rep sets have no natural duration to fill
  }, [step, phase, elapsed, restSec]);

  if (loading) {
    return <Screen><p className="text-sm text-slate-500">Loading {workout.name}…</p></Screen>;
  }

  if (error) {
    return (
      <Screen>
        <p className="text-sm text-rose-400">{error}</p>
        <button onClick={onExit} className="mt-4 text-sm text-slate-400 hover:text-slate-100">
          Back
        </button>
      </Screen>
    );
  }

  if (phase === "complete") {
    const done = log.filter((e) => !e.skipped);
    const shortfalls = done.filter(
      (e) => e.targetValue != null && e.actualValue < e.targetValue
    );

    return (
      <Screen>
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{workout.name}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Done</h1>
        <p className="mt-2 text-slate-400" style={{ fontVariantNumeric: "tabular-nums" }}>
          {done.length} of {steps.length} sets ·{" "}
          {Math.round(done.reduce((s, e) => s + e.actualSec, 0) / 60)} min of work
        </p>

        {shortfalls.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            {shortfalls.length} {shortfalls.length === 1 ? "set" : "sets"} under target — logged as
            performed, not as failures.
          </p>
        )}

        <ul className="mt-6 divide-y divide-slate-800 border-y border-slate-800 max-h-64 overflow-y-auto">
          {log.map((e, i) => (
            <li key={i} className="py-2 flex items-baseline justify-between gap-3 text-sm">
              <span className={e.skipped ? "text-slate-600 line-through" : ""}>
                {e.name}
                {e.targetSets > 1 && (
                  <span className="text-slate-600"> · set {e.setNumber}</span>
                )}
              </span>
              <span
                className="text-slate-400 shrink-0"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {e.skipped
                  ? "skipped"
                  : `${e.actualValue}${e.targetType === "time" ? "s" : "×"} / ${e.targetValue}`}
              </span>
            </li>
          ))}
        </ul>

        <button
          onClick={finish}
          disabled={saving}
          className="mt-7 w-full bg-cyan-400 text-slate-950 rounded-sm py-3 font-medium
                     hover:bg-cyan-300 disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          {saving ? "Saving…" : "Save session"}
        </button>
        <button onClick={onExit} className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300">
          Discard
        </button>
      </Screen>
    );
  }

  const kind = KINDS[step.kind] ?? KINDS.stretch;
  const remaining =
    phase === "work" && step.targetType === "time"
      ? Math.max(0, step.targetValue - Math.floor(elapsed / 1000))
      : phase === "rest"
      ? Math.max(0, restSec - Math.floor(elapsed / 1000))
      : phase === "ready"
      ? Math.max(0, 5 - Math.floor(elapsed / 1000))
      : Math.floor(elapsed / 1000);

  return (
    <Screen>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
            {workout.name} · {idx + 1} of {steps.length}
          </p>
          <p className={`mt-1 text-[11px] uppercase tracking-[0.25em] ${kind.text}`}>
            {phase === "rest" ? "Rest" : phase === "ready" ? "Get ready" : kind.label}
          </p>
        </div>
        <button
          onClick={onExit}
          aria-label="End session"
          className="text-slate-600 hover:text-slate-300 p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <X size={18} />
        </button>
      </div>

      <Ring progress={progress} className={kind.ring}>
        <span
          className="text-6xl font-semibold tracking-tight tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {remaining}
        </span>
        <span className="text-xs text-slate-500 mt-1">
          {phase === "work" && step.targetType === "reps" ? "elapsed" : "seconds"}
        </span>
      </Ring>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-center">
        {phase === "rest" ? `Next: ${step.name}` : step.name}
      </h1>
      <p className="mt-1 text-center text-slate-400" style={{ fontVariantNumeric: "tabular-nums" }}>
        {describeTarget(step, { long: true })}
        {step.totalSets > 1 && (
          <span className="text-slate-600">
            {" "}
            · set {step.setNumber} of {step.totalSets}
          </span>
        )}
      </p>
      {step.cue && phase === "work" && (
        <p className="mt-3 text-center text-sm text-slate-500">{step.cue}</p>
      )}

      {/* Rep sets: adjust before logging, so a shortfall is recorded honestly. */}
      {phase === "work" && step.targetType === "reps" && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setRepCount((c) => Math.max(0, (c ?? step.targetValue) - 1))}
            aria-label="One fewer rep"
            className="w-10 h-10 border border-slate-700 rounded-sm grid place-items-center
                       text-slate-400 hover:text-slate-100 hover:border-slate-500
                       focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <Minus size={15} />
          </button>
          <div className="text-center min-w-16">
            <span
              className="text-2xl font-semibold"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {repCount ?? step.targetValue}
            </span>
            <span className="block text-[11px] uppercase tracking-[0.2em] text-slate-500">
              reps done
            </span>
          </div>
          <button
            onClick={() => setRepCount((c) => (c ?? step.targetValue) + 1)}
            aria-label="One more rep"
            className="w-10 h-10 border border-slate-700 rounded-sm grid place-items-center
                       text-slate-400 hover:text-slate-100 hover:border-slate-500
                       focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <Plus size={15} />
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-3 gap-3">
        <button
          onClick={() => setPaused((p) => !p)}
          className="border border-slate-700 rounded-sm py-3 grid place-items-center
                     text-slate-300 hover:border-slate-500
                     focus:outline-none focus:ring-1 focus:ring-cyan-400"
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>

        <button
          onClick={() => closeOut(phase === "work" ? "tap" : "skipped", repCount)}
          className="bg-cyan-400 text-slate-950 rounded-sm py-3 grid place-items-center font-medium
                     hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400
                     focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label={phase === "work" ? "Mark done" : "Skip ahead"}
        >
          <Check size={18} />
        </button>

        <button
          onClick={() => closeOut("skipped")}
          className="border border-slate-700 rounded-sm py-3 grid place-items-center
                     text-slate-300 hover:border-slate-500
                     focus:outline-none focus:ring-1 focus:ring-cyan-400"
          aria-label="Skip this set"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {RECOGNITION_SUPPORTED ? (
        <button
          onClick={toggleListening}
          className={`mt-4 w-full border rounded-sm py-2.5 inline-flex items-center justify-center gap-2 text-sm
                      focus:outline-none focus:ring-1 focus:ring-cyan-400
                      ${listening
                        ? "border-cyan-400 text-cyan-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
        >
          {listening ? <Mic size={15} /> : <MicOff size={15} />}
          {listening ? "Listening — say done, skip, or a number" : "Hands free"}
        </button>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-600">
          <Volume2 size={11} className="inline mr-1" />
          Voice check-ins need Chrome or Edge.
        </p>
      )}

      {paused && <p className="mt-3 text-center text-xs text-slate-500">Paused</p>}
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}

function Ring({ progress, className, children }) {
  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <div className="mt-8 relative grid place-items-center">
      <svg width="208" height="208" className="-rotate-90">
        <circle cx="104" cy="104" r={R} className="stroke-slate-800" strokeWidth="6" fill="none" />
        <circle
          cx="104"
          cy="104"
          r={R}
          className={className}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
    </div>
  );
}
