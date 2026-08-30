import React, { useEffect, useState, useRef } from "react";
import { X, Play, ExternalLink, Pencil, AlertTriangle } from "lucide-react";
import { fetchExercise, describeTarget, fetchAvailability, fetchAlternatives } from "../lib/data";

const KINDS = {
  stretch: { label: "Stretch", text: "text-kind-stretch-hi", bg: "bg-kind-stretch" },
  strength: { label: "Strength", text: "text-kind-strength", bg: "bg-kind-strength" },
  core: { label: "Core", text: "text-kind-core-hi", bg: "bg-kind-core" },
  cardio: { label: "Cardio", text: "text-kind-cardio-hi", bg: "bg-kind-cardio" },
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
  const [blocked, setBlocked] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
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

  // Equipment you don't own doesn't hide an exercise — it explains it, and
  // offers something you could do instead.
  useEffect(() => {
    const id = data?.id ?? exerciseId;
    if (!id) return;
    let cancelled = false;

    fetchAvailability()
      .then((all) => {
        if (cancelled) return;
        const mine = all[id];
        if (!mine || mine.canDo) return setBlocked(null);
        setBlocked(mine);
        return fetchAlternatives(id).then((alts) => !cancelled && setAlternatives(alts));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [data?.id, exerciseId]);

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
      className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={data?.name ?? "Exercise"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-surface border-t sm:border
                   border-line-hi sm:rounded-sm px-5 pb-8 pt-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {kind && (
              <p className={`text-[11px] uppercase tracking-[0.25em] ${kind.text}`}>{kind.label}</p>
            )}
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {loading ? "Loading…" : data?.name ?? "Not found"}
            </h2>
            {data && (
              <p className="mt-1 text-sm text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                {describeTarget(
                  {
                    targetType: data.suggestedType,
                    targetValue: data.suggestedValue,
                    sets: data.suggestedSets,
                  },
                  { long: true }
                )}
                <span className="text-faint"> suggested</span>
                {data.builtIn && <span className="text-faint"> · shared</span>}
              </p>
            )}
          </div>

          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-subtle hover:text-ink-soft focus:outline-none focus:ring-1 focus:ring-accent rounded-sm p-1"
          >
            <X size={18} />
          </button>
        </div>

        {error && <p className="mt-6 text-sm text-danger">{error}</p>}

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
                    className="w-full aspect-video border border-line-hi rounded-sm grid place-items-center
                               text-muted hover:text-ink hover:border-line-hi3
                               focus:outline-none focus:ring-1 focus:ring-accent"
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
                    className="inline-flex items-center gap-1.5 text-sm text-accent-hi hover:text-accent-soft"
                  >
                    Open the video <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* ------------------------------------------------ how to do it */}
            {data.instructions && (
              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">Remember</p>
                <p className="mt-1.5 text-ink-soft">{data.instructions}</p>
              </div>
            )}

            {data.description && (
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">About</p>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{data.description}</p>
              </div>
            )}

            {blocked && (
              <div className="mt-6 border border-warn-deep/60 bg-warn-bg/20 rounded-sm p-4">
                <p className="inline-flex items-center gap-2 text-sm text-warn-hi">
                  <AlertTriangle size={15} />
                  You don't have {blocked.missing.join(" or ")}
                </p>

                {alternatives.length > 0 ? (
                  <>
                    <p className="mt-2 text-xs text-muted">
                      Works the same area, and you have what it needs:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {alternatives.map((alt) => (
                        <li key={alt.exerciseId} className="text-sm text-ink-dim">
                          {alt.name}
                          <span className="text-faint text-xs">
                            {" "}
                            · {alt.sharedAreas === 1 ? "same area" : `${alt.sharedAreas} shared areas`}
                            {alt.needs.length > 0 && ` · needs ${alt.needs.join(", ")}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-subtle">
                    Nothing in your library covers the same ground yet.
                  </p>
                )}
              </div>
            )}

            <Tags attributes={data.attributes} />

            {!data.builtIn && onEdit && (
              <button
                onClick={() => onEdit(data)}
                className="mt-7 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink
                           focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
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
          <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
            {LABELS[key] ?? key.replace(/_/g, " ")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {values.map((v) => (
              <span
                key={v.id}
                className="text-xs text-ink-dim border border-line-hi rounded-sm px-2 py-0.5"
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
