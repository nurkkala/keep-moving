import React, { useState, useEffect } from "react";
import { ChevronLeft, TrendingUp } from "lucide-react";
import {
  fetchHistory, fetchKindTotals, fetchPerformanceHistory, fetchBests,
  clearHistory, describeTarget, describeOrderMode,
} from "../lib/coachData";

const KINDS = {
  stretch: { label: "Stretch", bg: "bg-cyan-400", text: "text-cyan-300" },
  strength: { label: "Strength", bg: "bg-orange-400", text: "text-orange-400" },
  core: { label: "Core", bg: "bg-violet-400", text: "text-violet-300" },
  cardio: { label: "Cardio", bg: "bg-rose-400", text: "text-rose-300" },
};

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
    if (!window.confirm("Delete every saved session? This can't be undone.")) return;
    await clearHistory();
    load();
  };

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

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">History</h1>

        {loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
        {error && <p className="mt-6 text-sm text-rose-400">{error}</p>}

        {!loading && !error && (
          <>
            <div className="mt-6 border border-slate-800 rounded-sm p-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">All time</p>
              <p
                className="mt-1 text-3xl font-semibold tracking-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Math.round(grand / 60)}{" "}
                <span className="text-base font-normal text-slate-400">
                  min across {sessions.length} sessions
                </span>
              </p>
              <KindBar byKind={totals} total={grand} />
            </div>

            {sessions.length === 0 ? (
              <p className="mt-8 text-sm text-slate-600 border border-dashed border-slate-800 rounded-sm p-8 text-center">
                No sessions saved yet. Finish a workout and it lands here.
              </p>
            ) : (
              <ul className="mt-7 space-y-5">
                {sessions.map((s) => (
                  <li key={s.id} className="border-b border-slate-800 pb-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm">
                        {day(s.at)}
                        {s.workoutName && (
                          <span className="text-slate-500"> · {s.workoutName}</span>
                        )}
                      </span>
                      <span
                        className="text-sm text-slate-400 shrink-0"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {Math.round(s.totalSec / 60)} min
                      </span>
                    </div>

                    {s.orderMode && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
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
                                       hover:text-slate-200 disabled:hover:text-inherit
                                       focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          >
                            <span
                              className={`w-1 h-1 rounded-full shrink-0 ${
                                KINDS[it.kind]?.bg ?? "bg-slate-600"
                              }`}
                            />
                            <span className="flex-1 text-slate-400">{it.name}</span>
                            <span
                              className={`shrink-0 ${
                                it.metEverySet ? "text-slate-500" : "text-slate-600"
                              }`}
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {it.setsDone}
                              {it.targetSets > 1 && `/${it.targetSets}`} ×{" "}
                              {it.targetType === "time" ? `${it.totalValue}s` : it.totalValue}
                              {!it.metEverySet && (
                                <span className="text-slate-700"> · under</span>
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
                onClick={clear}
                className="mt-6 text-xs text-slate-600 hover:text-rose-400"
              >
                Clear saved history
              </button>
            )}
          </>
        )}
      </div>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-200
                     focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm"
        >
          <ChevronLeft size={15} /> History
        </button>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{detail.name}</h1>

        {best && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-400">
            <TrendingUp size={14} className="text-cyan-300" />
            Best set{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {describeTarget({ targetType: best.targetType, targetValue: best.bestSet })}
            </span>
            <span className="text-slate-600">· {best.timesPerformed} sessions</span>
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        ) : bySession.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">You haven't done this one yet.</p>
        ) : (
          <ul className="mt-7 space-y-4">
            {bySession.map((s) => (
              <li key={s.at} className="border-b border-slate-800 pb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">{day(s.at)}</span>
                  <span className="text-[11px] text-slate-600">
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
                                    ? "border-slate-800 text-slate-700 line-through"
                                    : set.metTarget
                                    ? "border-cyan-900 text-cyan-300"
                                    : "border-slate-700 text-slate-400"}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {set.skipped
                        ? "skip"
                        : `${set.actualValue}${set.targetType === "time" ? "s" : ""}`}
                    </span>
                  ))}
                </div>

                {/* The target as it stood that day — not today's. */}
                <p className="mt-1.5 text-[11px] text-slate-600">
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
      <div className="mt-3 flex h-1.5 rounded-sm overflow-hidden bg-slate-800">
        {Object.entries(byKind).map(([kind, sec]) => (
          <div
            key={kind}
            className={KINDS[kind]?.bg ?? "bg-slate-600"}
            style={{ width: `${(sec / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(byKind).map(([kind, sec]) => (
          <span key={kind} className="text-[11px] text-slate-500">
            <span className={KINDS[kind]?.text ?? ""}>·</span> {KINDS[kind]?.label ?? kind}{" "}
            {Math.round(sec / 60)}m
          </span>
        ))}
      </div>
    </>
  );
}
