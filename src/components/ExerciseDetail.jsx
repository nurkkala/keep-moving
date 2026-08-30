import React, { useEffect, useState, useRef } from "react";
import { X, Play, ExternalLink, Pencil } from "lucide-react";
import { fetchExercise } from "../lib/coachData";

const KINDS = {
  stretch: { label: "Stretch", text: "text-cyan-300", bg: "bg-cyan-400" },
  strength: { label: "Strength", text: "text-orange-400", bg: "bg-orange-400" },
  core: { label: "Core", text: "text-violet-300", bg: "bg-violet-400" },
  cardio: { label: "Cardio", text: "text-rose-300", bg: "bg-rose-400" },
};

/** Turns a watch URL into an embeddable one. Returns null if we can't. */
function embedUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function target(ex) {
  if (!ex) return "";
  return ex.type === "time" ? `${ex.seconds} seconds` : `${ex.reps} reps`;
}

/**
 * A detail sheet for one exercise. Pass either a full exercise object or just
 * an id — it fetches what it doesn't have.
 *
 *   <ExerciseDetail exerciseId={id} onClose={…} onEdit={…} />
 */
export default function ExerciseDetail({ exercise, exerciseId, onClose, onEdit }) {
  const [data, setData] = useState(exercise ?? null);
  const [loading, setLoading] = useState(!exercise);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    if (exercise) {
      setData(exercise);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetchExercise(exerciseId)
      .then((found) => {
        if (cancelled) return;
        if (!found) setError("That exercise no longer exists.");
        else setData(found);
      })
      .catch(() => !cancelled && setError("Couldn't load this exercise."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [exercise, exerciseId]);

  // Escape closes; focus lands on the close button so keyboard users aren't lost.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const kind = data ? KINDS[data.kind] : null;
  const embed = embedUrl(data?.videoUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={data?.name ?? "Exercise"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-t sm:border
                   border-slate-700 sm:rounded-sm px-5 pb-8 pt-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {kind && (
              <p className={`text-[11px] uppercase tracking-[0.25em] ${kind.text}`}>{kind.label}</p>
            )}
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
              {loading ? "Loading…" : data?.name ?? "Not found"}
            </h2>
            {data && (
              <p className="mt-1 text-sm text-slate-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                {target(data)}
                {data.builtIn && <span className="text-slate-600"> · built in</span>}
              </p>
            )}
          </div>

          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm p-1"
          >
            <X size={18} />
          </button>
        </div>

        {error && <p className="mt-6 text-sm text-rose-400">{error}</p>}

        {data && (
          <>
            {/* ------------------------------------------------------- video */}
            {data.videoUrl && (
              <div className="mt-5">
                {embed && playing ? (
                  <div className="aspect-video bg-black rounded-sm overflow-hidden">
                    <iframe
                      src={`${embed}?autoplay=1`}
                      title={`${data.name} demonstration`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : embed ? (
                  <button
                    onClick={() => setPlaying(true)}
                    className="w-full aspect-video border border-slate-700 rounded-sm grid place-items-center
                               text-slate-400 hover:text-slate-100 hover:border-slate-500
                               focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Play size={16} /> Watch the demonstration
                    </span>
                  </button>
                ) : (
                  <a
                    href={data.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Open the video <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* ------------------------------------------------ how to do it */}
            {data.instructions && (
              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Remember</p>
                <p className="mt-1.5 text-slate-200">{data.instructions}</p>
              </div>
            )}

            {data.description && (
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">About</p>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{data.description}</p>
              </div>
            )}

            <Tags attributes={data.attributes} />

            {!data.builtIn && onEdit && (
              <button
                onClick={() => onEdit(data)}
                className="mt-7 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100
                           focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded-sm"
              >
                <Pencil size={13} /> Edit this exercise
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Attributes grouped by axis, in the order the vocabulary defines. */
function Tags({ attributes }) {
  const axes = Object.entries(attributes ?? {});
  if (!axes.length) return null;

  const LABELS = {
    body_area: "Works",
    condition: "Helps with",
    equipment: "Needs",
    difficulty: "Level",
  };

  return (
    <div className="mt-6 space-y-3.5">
      {axes.map(([key, values]) => (
        <div key={key}>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
            {LABELS[key] ?? key.replace(/_/g, " ")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {values.map((v) => (
              <span
                key={v.id}
                className="text-xs text-slate-300 border border-slate-700 rounded-sm px-2 py-0.5"
              >
                {v.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
