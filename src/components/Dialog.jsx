import React, { useEffect, useRef, useState } from "react";

/**
 * Replaces window.confirm and window.prompt.
 *
 * The native ones can't be themed, ignore the dark/light choice entirely, and
 * render as a desktop alert on a screen sized for a thumb. These match the
 * sheets: full-width from the bottom on a phone, a centred panel above `sm`.
 *
 * Escape cancels and focus moves into the dialog on open, which the native
 * dialogs gave for free and a div does not.
 */
export function DialogShell({ label, onCancel, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-surface border-t sm:border border-line-hi
                   sm:rounded-sm px-5 pb-8 pt-5"
      >
        {children}
      </div>
    </div>
  );
}

export const CANCEL =
  "flex-1 border border-line rounded-sm py-2.5 text-sm text-muted " +
  "hover:border-line-hi2 hover:text-ink-soft " +
  "focus:outline-none focus:ring-1 focus:ring-accent";

/**
 * `destructive` is its own colour rather than the accent, because the button
 * that deletes your history should not look like the button that saves.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <DialogShell label={title} onCancel={onCancel}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {body && <p className="mt-2 text-sm text-muted leading-relaxed">{body}</p>}

      <div className="mt-6 flex gap-2">
        <button onClick={onCancel} className={CANCEL}>
          Cancel
        </button>
        <button
          ref={ref}
          onClick={onConfirm}
          className={`flex-1 rounded-sm py-2.5 text-sm font-medium
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface
                      ${destructive
                        ? "bg-danger text-on-accent hover:bg-danger-hi focus:ring-danger"
                        : "bg-accent text-on-accent hover:bg-accent-hi focus:ring-accent"}`}
        >
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}

/** A single line of text. Enter submits, empty is refused. */
export function PromptDialog({
  title,
  label,
  defaultValue = "",
  confirmLabel = "Save",
  onSubmit,
  onCancel,
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <DialogShell label={title} onCancel={onCancel}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      <form onSubmit={submit}>
        {label && (
          <label
            htmlFor="prompt-input"
            className="mt-4 block text-[11px] uppercase tracking-[0.25em] text-subtle"
          >
            {label}
          </label>
        )}
        <input
          id="prompt-input"
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1.5 w-full bg-canvas border border-line-hi rounded-sm px-3 py-2 text-sm
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className={CANCEL}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex-1 bg-accent text-on-accent rounded-sm py-2.5 text-sm font-medium
                       hover:bg-accent-hi disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-accent
                       focus:ring-offset-2 focus:ring-offset-surface"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
