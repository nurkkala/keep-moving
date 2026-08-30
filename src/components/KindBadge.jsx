import React from "react";
import { StretchHorizontal, Dumbbell, Shield, HeartPulse } from "lucide-react";

/**
 * The four exercise kinds, in one place.
 *
 * This map was copied into four components with slightly different shapes,
 * which is how `strength` ended up the only kind whose text and fill were the
 * same step. One definition now; import from here.
 *
 * `ring` is the SVG stroke the session timer draws with — same colour, a
 * property SVG needs spelled differently.
 */
export const KINDS = {
  stretch: { label: "Stretch", Icon: StretchHorizontal, bg: "bg-kind-stretch", text: "text-kind-stretch-hi", ring: "stroke-kind-stretch" },
  strength: { label: "Strength", Icon: Dumbbell, bg: "bg-kind-strength", text: "text-kind-strength", ring: "stroke-kind-strength" },
  core: { label: "Core", Icon: Shield, bg: "bg-kind-core", text: "text-kind-core-hi", ring: "stroke-kind-core" },
  cardio: { label: "Cardio", Icon: HeartPulse, bg: "bg-kind-cardio", text: "text-kind-cardio-hi", ring: "stroke-kind-cardio" },
};

/**
 * A 4px dot said the kind in colour alone — unreadable if you don't already
 * know the code, and invisible if you can't separate the hues. The badge keeps
 * the colour but adds a shape, and `title` says it in words.
 *
 * `text-on-accent` is the foreground in both themes: kind colours are light in
 * dark mode and dark in light mode, and that token flips the same way.
 */
export default function KindBadge({ kind, size = "md", className = "" }) {
  const meta = KINDS[kind];
  // xs keeps the History set list dense; md is the default for browsing lists.
  const box = { xs: "w-4 h-4", sm: "w-5 h-5", md: "w-6 h-6" }[size] ?? "w-6 h-6";
  const glyph = { xs: 9, sm: 11, md: 13 }[size] ?? 13;

  if (!meta) {
    return <span className={`${box} rounded-sm bg-track shrink-0 ${className}`} aria-hidden="true" />;
  }

  const { label, Icon, bg } = meta;
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`${box} rounded-sm ${bg} text-on-accent
                  inline-grid place-items-center shrink-0 ${className}`}
    >
      <Icon size={glyph} strokeWidth={2.25} />
    </span>
  );
}
