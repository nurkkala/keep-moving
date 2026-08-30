import React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * What one exercise needs, said in the list instead of behind a tap.
 *
 * Three states, and the quiet one matters: most of the library is bodyweight,
 * so an exercise needing nothing renders nothing. If every row carried a note,
 * the rows that do need something would stop standing out.
 *
 * Missing kit warns rather than hides, per the equipment rule — you might
 * borrow a band, and an exercise filtered away would just be confusing.
 */
export default function EquipmentNote({ availability, className = "" }) {
  const needs = availability?.needs ?? [];
  const missing = availability?.missing ?? [];

  if (!needs.length) return null;

  if (missing.length) {
    return (
      <span
        className={`inline-flex items-baseline gap-1 text-xs text-warn-hi ${className}`}
        title={`Needs ${needs.join(", ")} — you don't have ${missing.join(" or ")}`}
      >
        <AlertTriangle size={11} className="shrink-0 translate-y-px" />
        {missing.join(" + ")} — don't have
      </span>
    );
  }

  return (
    <span className={`text-xs text-faint ${className}`} title="You have what this needs">
      {needs.join(" + ")}
    </span>
  );
}
