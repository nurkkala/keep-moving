import React, { useState, useEffect } from "react";
import { ChevronLeft, TrendingUp } from "lucide-react";
import {
  fetchHistory, fetchKindTotals, fetchPerformanceHistory, fetchBests,
  clearHistory, describeTarget, describeOrderMode,
} from "../lib/data";
import KindBadge, { KINDS } from "./KindBadge";
import { ConfirmDialog } from "./Dialog";

const day = (ms) =>
  new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export default function History({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [totals, setTotals] = useState({});
  const [bests, setBests] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([fetchHistory(), fetchKindTotals(), fetchBests()])
      .then(([s, t, b]) => {
        setSessions(s);
        setTotals(t);
        setBests(b);
      })
      .catch((e) => setError(e.message ?? "Couldn't load your history."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (detail) {
    return <ExerciseProgress detail={detail} best={bests[detail.exerciseId]} onBack={() => setDetail(null)} />;
  }

  const grand = Object.values(totals).reduce((a, b) => a + b, 0);

  const clear = async () => {
    setConfirming(false);
    await clearHistory();
    load();
  };

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

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">History</h1>

        {loading && <p className="mt-6 text-sm text-subtle">Loading…</p>}
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}

        {!loading && !error && (
          <>
            <div className="mt-6 border border-line rounded-sm p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">All time</p>
              <p
                className="mt-1 text-3xl font-semibold tracking-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Math.round(grand / 60)}{" "}
                <span className="text-base font-normal text-muted">
                  min across {sessions.length} sessions
                </span>
              </p>
              <KindBar byKind={totals} total={grand} />
            </div>

            {sessions.length === 0 ? (
              <p className="mt-8 text-sm text-faint border border-dashed border-line rounded-sm p-8 text-center">
                No sessions saved yet. Finish a workout and it lands here.
              </p>
            ) : (
              <ul className="mt-7 space-y-5">
                {sessions.map((s) => (
                  <li key={s.id} className="border-b border-line pb-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm">
                        {day(s.at)}
                        {s.workoutName && (
                          <span className="text-subtle"> · {s.workoutName}</span>
                        )}
                      </span>
                      <span
                        className="text-sm text-muted shrink-0"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {Math.round(s.totalSec / 60)} min
                      </span>
                    </div>

                    {s.orderMode && (
                      <p className="text-[11px] text-faint mt-0.5">
                        {describeOrderMode(s.orderMode)}
                      </p>
                    )}

                    <ul className="mt-2 space-y-1">
                      {s.items.map((it) => (
                        <li key={it.exerciseId ?? it.name}>
                          <button
                            onClick={() =>
                              it.exerciseId &&
                              setDetail({ exerciseId: it.exerciseId, name: it.name })
                            }
                            disabled={!it.exerciseId}
                            className="w-full text-left flex items-baseline gap-2 text-xs py-0.5
                                       hover:text-ink-soft disabled:hover:text-inherit
                                       focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <KindBadge kind={it.kind} size="xs" className="translate-y-px" />
                            <span className="flex-1 text-muted">{it.name}</span>
                            <span
                              className={`shrink-0 ${
                                it.metEverySet ? "text-subtle" : "text-faint"
                              }`}
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {it.setsDone}
                              {it.targetSets > 1 && `/${it.targetSets}`} ×{" "}
                              {it.targetType === "time" ? `${it.totalValue}s` : it.totalValue}
                              {!it.metEverySet && (
                                <span className="text-ghost"> · under</span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            {sessions.length > 0 && (
              <button
                onClick={() => setConfirming(true)}
                className="mt-6 text-xs text-faint hover:text-danger"
              >
                Clear saved history
              </button>
            )}
          </>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Clear saved history?"
          body="Every saved session is deleted. This can't be undone."
          confirmLabel="Delete everything"
          destructive
          onConfirm={clear}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** Set-by-set history for one exercise, newest first. */
function ExerciseProgress({ detail, best, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceHistory(detail.exerciseId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [detail.exerciseId]);

  // Group by session so sets read as a block even when a circuit split them.
  const bySession = [];
  for (const r of rows) {
    const last = bySession[bySession.length - 1];
    if (last && last.at === r.at) last.sets.push(r);
    else bySession.push({ at: r.at, workoutName: r.workoutName, orderMode: r.orderMode, sets: [r] });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink px-5 py-8 sm:px-8 lg:py-14">
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink-soft
                     focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
        >
          <ChevronLeft size={15} /> History
        </button>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{detail.name}</h1>

        {best && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
            <TrendingUp size={14} className="text-accent-hi" />
            Best set{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {describeTarget({ targetType: best.targetType, targetValue: best.bestSet })}
            </span>
            <span className="text-faint">· {best.timesPerformed} sessions</span>
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-subtle">Loading…</p>
        ) : bySession.length === 0 ? (
          <p className="mt-6 text-sm text-faint">You haven't done this one yet.</p>
        ) : (
          <ul className="mt-7 space-y-4">
            {bySession.map((s) => (
              <li key={s.at} className="border-b border-line pb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">{day(s.at)}</span>
                  <span className="text-[11px] text-faint">
                    {s.workoutName} {s.orderMode === "circuit" && "· circuit"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.sets.map((set, i) => (
                    <span
                      key={i}
                      title={
                        set.skipped
                          ? "Skipped"
                          : `Set ${set.setNumber} · target ${set.targetValue}`
                      }
                      className={`text-xs border rounded-sm px-2 py-0.5
                                  ${set.skipped
                                    ? "border-line text-ghost line-through"
                                    : set.metTarget
                                    ? "border-accent-deep text-accent-hi"
                                    : "border-line-hi text-muted"}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {set.skipped
                        ? "skip"
                        : `${set.actualValue}${set.targetType === "time" ? "s" : ""}`}
                    </span>
                  ))}
                </div>

                {/* The target as it stood that day — not today's. */}
                <p className="mt-1.5 text-[11px] text-faint">
                  Target then:{" "}
                  {describeTarget({
                    targetType: s.sets[0].targetType,
                    targetValue: s.sets[0].targetValue,
                    sets: s.sets[0].targetSets,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function KindBar({ byKind, total }) {
  if (!total) return null;

  return (
    <>
      <div className="mt-3 flex h-1.5 rounded-sm overflow-hidden bg-surface-hi">
        {Object.entries(byKind).map(([kind, sec]) => (
          <div
            key={kind}
            className={KINDS[kind]?.bg ?? "bg-track"}
            style={{ width: `${(sec / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(byKind).map(([kind, sec]) => (
          <span key={kind} className="inline-flex items-center gap-1 text-[11px] text-subtle">
            <KindBadge kind={kind} size="xs" />
            {KINDS[kind]?.label ?? kind} {Math.round(sec / 60)}m
          </span>
        ))}
      </div>
    </>
  );
}
