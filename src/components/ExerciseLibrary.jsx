import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, Plus, AlertTriangle, Tags } from "lucide-react";
import { fetchExercises, fetchAvailability, describeTarget } from "../lib/data";
import KindBadge from "./KindBadge";
import EquipmentNote from "./EquipmentNote";
import ExerciseDetail from "./ExerciseDetail";
import ExerciseEditor from "./ExerciseEditor";

/* Filtering happens in memory. The library is the thirteen seeded exercises
   plus whatever you've added, so one fetch is cheaper than a query per
   keystroke and the search feels instant. */
const FILTERS = [
  { key: "all", label: "All", match: () => true },
  { key: "kit", label: "Needs kit", match: (a) => (a?.needs ?? []).length > 0 },
  { key: "blocked", label: "Missing kit", match: (a) => (a?.missing ?? []).length > 0 },
  { key: "mine", label: "Mine", match: (_a, ex) => !ex.builtIn },
];

/**
 * The whole exercise library, browsable.
 *
 * Until this existed the only way to see an exercise was to find a workout
 * containing it, which left anything you'd created but not scheduled
 * unreachable. It's also where equipment is easiest to survey: what you can't
 * do right now is a filter rather than a drill-down.
 */
export default function ExerciseLibrary({ onBack, onTags }) {
  const [all, setAll] = useState([]);
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [detailId, setDetailId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const reload = () => {
    setLoading(true);
    return Promise.all([fetchExercises(), fetchAvailability()])
      .then(([list, avail]) => {
        setAll(list);
        setAvailability(avail);
        setError(null);
      })
      .catch((e) => setError(e.message ?? "Couldn't load the exercise library."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    return all.filter((ex) => {
      if (!test(availability[ex.id], ex)) return false;
      if (!needle) return true;
      return (
        ex.name.toLowerCase().includes(needle) ||
        ex.description.toLowerCase().includes(needle)
      );
    });
  }, [all, availability, search, filter]);

  const blockedCount = useMemo(
    () => all.filter((ex) => (availability[ex.id]?.missing ?? []).length > 0).length,
    [all, availability]
  );

  if (creating || editing) {
    return (
      <ExerciseEditor
        exercise={editing ?? undefined}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          reload();
        }}
      />
    );
  }

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

        <div className="mt-4 flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Exercises</h1>
          {onTags && (
            <button
              onClick={onTags}
              className="inline-flex items-center gap-1 text-xs text-subtle hover:text-ink-dim
                         focus:outline-none focus:ring-1 focus:ring-accent rounded-sm shrink-0"
            >
              <Tags size={12} /> Tags
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Everything in the library, whether or not it's in a workout. Tap one to read it or
          change it.
        </p>

        <label className="mt-6 flex items-center gap-2 border border-line rounded-sm px-3 py-2
                          focus-within:border-accent">
          <Search size={14} className="text-subtle shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-subtle hover:text-ink-dim shrink-0"
            >
              Clear
            </button>
          )}
        </label>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs border rounded-sm px-2 py-0.5
                          focus:outline-none focus:ring-1 focus:ring-accent
                          ${filter === f.key
                            ? "border-accent bg-accent text-on-accent font-medium"
                            : "border-line text-subtle hover:border-line-hi2"}`}
            >
              {f.label}
              {f.key === "blocked" && blockedCount > 0 && ` (${blockedCount})`}
            </button>
          ))}
        </div>

        {loading && <p className="mt-6 text-sm text-subtle">Loading…</p>}
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}

        {!loading && !error && (
          <>
            {shown.length === 0 ? (
              <p className="mt-8 text-sm text-subtle">
                {filter === "blocked"
                  ? "Nothing is blocked — you have what everything needs."
                  : "Nothing matches."}
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {shown.map((ex) => (
                  <li key={ex.id}>
                    <button
                      onClick={() => setDetailId(ex.id)}
                      className="w-full text-left flex items-start gap-3 py-3
                                 hover:text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <KindBadge kind={ex.kind} className="mt-0.5" />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate">{ex.name}</span>
                          {!ex.builtIn && (
                            <span className="text-[10px] uppercase tracking-[0.2em] text-subtle shrink-0">
                              yours
                            </span>
                          )}
                        </span>
                        {ex.description && (
                          <span className="block text-xs text-subtle mt-0.5 line-clamp-1">
                            {ex.description}
                          </span>
                        )}
                        <EquipmentNote availability={availability[ex.id]} className="mt-1" />
                      </span>
                      <span
                        className="text-sm text-faint shrink-0 mt-0.5"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {describeTarget({
                          targetType: ex.suggestedType,
                          targetValue: ex.suggestedValue,
                          sets: ex.suggestedSets,
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-[11px] text-subtle">
              {shown.length} of {all.length} · targets shown are the library's suggestion, not
              yours
            </p>

            <button
              onClick={() => setCreating(true)}
              className="mt-6 w-full border border-dashed border-line rounded-sm py-3
                         inline-flex items-center justify-center gap-1.5 text-sm text-subtle
                         hover:border-line-hi2 hover:text-ink-dim
                         focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <Plus size={14} /> New exercise
            </button>

            {blockedCount > 0 && filter !== "blocked" && (
              <p className="mt-4 inline-flex items-baseline gap-1.5 text-xs text-warn-hi">
                <AlertTriangle size={12} className="shrink-0 translate-y-px" />
                {blockedCount} {blockedCount === 1 ? "exercise needs" : "exercises need"} kit you
                don't have. They still show — you might borrow one.
              </p>
            )}
          </>
        )}
      </div>

      {detailId && (
        <ExerciseDetail
          exerciseId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(ex) => {
            setDetailId(null);
            setEditing(ex);
          }}
        />
      )}
    </div>
  );
}
