import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2, Lock } from "lucide-react";
import {
  fetchAttributeTypes,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
  createAttributeType,
  updateAttributeType,
  deleteAttributeType,
  fetchAttributeUsage,
} from "../lib/data";
import { ConfirmDialog, PromptDialog, DialogShell, CANCEL } from "./Dialog";

/**
 * `key` is what rules and queries match on; `label` is what you read. Derived
 * from the label on creation so there's one thing to type, and never changed
 * afterwards — a rule slot matching `sciatica` would silently stop matching if
 * the key moved under it. Renaming edits the label alone.
 */
const toKey = (label) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/**
 * Maintenance for the tag vocabulary — body area, condition, equipment,
 * difficulty, and any axis added later.
 *
 * The seeded values are shared by everyone and read-only: RLS rejects a write
 * where `user_id is null`, so they're shown with a lock rather than offered
 * and then refused. Your own additions sit alongside them.
 */
export default function AttributeEditor({ onBack }) {
  const [axes, setAxes] = useState([]);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adding, setAdding] = useState(null); // the axis being added to
  const [renaming, setRenaming] = useState(null); // { axis, value }
  const [deleting, setDeleting] = useState(null); // { axis, value }

  const [addingAxis, setAddingAxis] = useState(false);
  const [renamingAxis, setRenamingAxis] = useState(null);
  const [deletingAxis, setDeletingAxis] = useState(null);

  const load = () => {
    setLoading(true);
    return Promise.all([fetchAttributeTypes(), fetchAttributeUsage().catch(() => ({}))])
      .then(([a, u]) => {
        setAxes(a);
        setUsage(u);
        setError(null);
      })
      .catch((e) => setError(e.message ?? "Couldn't load the tag vocabulary."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async ({ label, description }) => {
    const axis = adding;
    setAdding(null);
    try {
      await createAttributeValue(axis.id, toKey(label), label.trim(), description.trim());
      await load();
    } catch (e) {
      setError(
        e.code === "23505"
          ? `"${label.trim()}" already exists on ${axis.label}.`
          : e.message
      );
    }
  };

  const rename = async ({ label, description }) => {
    const { value } = renaming;
    setRenaming(null);
    try {
      // Label and description only — the key stays put so rules keep matching.
      await updateAttributeValue(value.id, {
        label: label.trim(),
        description: description.trim(),
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async () => {
    const { value } = deleting;
    setDeleting(null);
    try {
      await deleteAttributeValue(value.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const addAxis = async ({ label, multiValued }) => {
    setAddingAxis(false);
    try {
      await createAttributeType(toKey(label), label.trim(), multiValued);
      await load();
    } catch (e) {
      setError(
        e.code === "23505" ? `You already have an axis called "${label.trim()}".` : e.message
      );
    }
  };

  const renameAxis = async (label) => {
    const axis = renamingAxis;
    setRenamingAxis(null);
    try {
      await updateAttributeType(axis.id, { label: label.trim() });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeAxis = async () => {
    const axis = deletingAxis;
    setDeletingAxis(null);
    try {
      await deleteAttributeType(axis.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink px-5 py-8 sm:px-8 lg:py-14">
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-ink-soft
                     focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
        >
          <ChevronLeft size={15} /> Exercises
        </button>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Tags</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          The vocabulary exercises are tagged with, and rule slots match on. The seeded values
          are shared and can't be changed; anything you add is yours.
        </p>

        {loading && <p className="mt-6 text-sm text-subtle">Loading…</p>}
        {error && (
          <div className="mt-6 border border-danger-deep rounded-sm p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {!loading &&
          axes.map((axis) => (
            <section key={axis.id} className="mt-9">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
                  {axis.label}
                </p>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-faint">
                    {axis.multiValued ? "many per exercise" : "one per exercise"}
                  </span>
                  {!axis.builtIn && (
                    <>
                      <button
                        onClick={() => setRenamingAxis(axis)}
                        aria-label={`Rename the ${axis.label} axis`}
                        className="text-subtle hover:text-ink-soft p-2 rounded-sm
                                   focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeletingAxis(axis)}
                        aria-label={`Delete the ${axis.label} axis`}
                        className="text-faint hover:text-danger p-2 rounded-sm
                                   focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </span>
              </div>

              <ul className="mt-2 divide-y divide-line border-y border-line">
                {axis.values.map((v) => {
                  const used = usage[v.id] ?? { exercises: 0, rules: 0 };
                  const { builtIn } = v;
                  return (
                    <li key={v.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{v.label}</span>
                        {v.description && (
                          <span className="block text-xs text-subtle mt-0.5">
                            {v.description}
                          </span>
                        )}
                        <span className="block text-[11px] text-faint mt-0.5">
                          {used.exercises === 0 && used.rules === 0
                            ? "unused"
                            : [
                                used.exercises &&
                                  `${used.exercises} exercise${used.exercises === 1 ? "" : "s"}`,
                                used.rules && `${used.rules} rule slot${used.rules === 1 ? "" : "s"}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                        </span>
                      </span>

                      {builtIn ? (
                        <span
                          title="Built in and shared — read only"
                          className="text-faint shrink-0 p-1"
                        >
                          <Lock size={13} />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setRenaming({ axis, value: v })}
                            aria-label={`Rename ${v.label}`}
                            className="text-subtle hover:text-ink-soft p-2 rounded-sm
                                       focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting({ axis, value: v })}
                            aria-label={`Delete ${v.label}`}
                            className="text-faint hover:text-danger p-2 rounded-sm
                                       focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => setAdding(axis)}
                className="mt-2 w-full border border-dashed border-line rounded-sm py-2
                           inline-flex items-center justify-center gap-1.5 text-xs text-subtle
                           hover:border-line-hi2 hover:text-ink-dim
                           focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <Plus size={13} /> Add to {axis.label.toLowerCase()}
              </button>
            </section>
          ))}

        {!loading && (
          <>
            <button
              onClick={() => setAddingAxis(true)}
              className="mt-9 w-full border border-dashed border-line rounded-sm py-3
                         inline-flex items-center justify-center gap-1.5 text-sm text-subtle
                         hover:border-line-hi2 hover:text-ink-dim
                         focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <Plus size={14} /> New axis
            </button>
            <p className="mt-2 text-[11px] text-subtle leading-relaxed">
              An axis is a whole category to tag by — "phase of recovery", "practitioner". The
              schema was built for this, so it's a row rather than a migration.
            </p>
          </>
        )}
      </div>

      {adding && (
        <ValueDialog
          title={`Add to ${adding.label.toLowerCase()}`}
          confirmLabel="Add"
          isKit={adding.key === "equipment"}
          onSubmit={add}
          onCancel={() => setAdding(null)}
        />
      )}

      {renaming && (
        <ValueDialog
          title="Edit tag"
          confirmLabel="Save"
          isKit={renaming.axis.key === "equipment"}
          defaultLabel={renaming.value.label}
          defaultDescription={renaming.value.description}
          onSubmit={rename}
          onCancel={() => setRenaming(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.value.label}"?`}
          body={describeDeletion(deleting.value, usage[deleting.value.id])}
          confirmLabel="Delete"
          destructive
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}

      {addingAxis && <AxisDialog onSubmit={addAxis} onCancel={() => setAddingAxis(false)} />}

      {renamingAxis && (
        <PromptDialog
          title="Rename axis"
          label="Label"
          defaultValue={renamingAxis.label}
          confirmLabel="Rename"
          onSubmit={renameAxis}
          onCancel={() => setRenamingAxis(null)}
        />
      )}

      {deletingAxis && (
        <ConfirmDialog
          title={`Delete the "${deletingAxis.label}" axis?`}
          body={
            `All ${deletingAxis.values.length} of its values go with it, and those tags come ` +
            `off every exercise and rule slot carrying them. This is much bigger than deleting ` +
            `a single value.`
          }
          confirmLabel="Delete the axis"
          destructive
          onConfirm={removeAxis}
          onCancel={() => setDeletingAxis(null)}
        />
      )}
    </div>
  );
}

const FIELD =
  "mt-1.5 w-full bg-canvas border border-line-hi rounded-sm px-3 py-2 text-sm " +
  "placeholder:text-ghost focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent";

const LABEL = "mt-4 block text-[11px] uppercase tracking-[0.25em] text-subtle";

/**
 * Label plus an optional line of prose.
 *
 * The description earns its place on equipment especially: "resistance band"
 * doesn't say which one, and knowing whether you own it depends on that.
 */
function ValueDialog({
  title,
  confirmLabel,
  isKit = false,
  defaultLabel = "",
  defaultDescription = "",
  onCancel,
  onSubmit,
}) {
  const [label, setLabel] = useState(defaultLabel);
  const [description, setDescription] = useState(defaultDescription);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (label.trim()) onSubmit({ label, description });
  };

  return (
    <DialogShell label={title} onCancel={onCancel}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      <form onSubmit={submit}>
        <label className={LABEL}>Label</label>
        <input
          ref={ref}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={isKit ? "Resistance band" : "Hamstrings"}
          className={FIELD}
        />

        <label className={LABEL}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={
            isKit
              ? "The light one, looped — in the hall cupboard."
              : "What this covers, in your own words."
          }
          className={FIELD}
        />
        {isKit && (
          <p className="mt-1 text-[11px] text-faint">
            Useful for saying which one, and where it lives.
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className={CANCEL}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!label.trim()}
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

/**
 * Two fields, so PromptDialog won't do. `multi_valued` can't be inferred from
 * a name and changes how the editor behaves — difficulty replaces, body area
 * accumulates — so it's asked for up front.
 */
function AxisDialog({ onCancel, onSubmit }) {
  const [label, setLabel] = useState("");
  const [multiValued, setMultiValued] = useState(true);
  const ref = useRef(null);

  useEffect(() => ref.current?.focus(), []);

  const submit = (e) => {
    e.preventDefault();
    if (label.trim()) onSubmit({ label, multiValued });
  };

  return (
    <DialogShell label="New axis" onCancel={onCancel}>
      <h2 className="text-xl font-semibold tracking-tight">New axis</h2>

      <form onSubmit={submit}>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.25em] text-subtle">
          Label
        </label>
        <input
          ref={ref}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Phase of recovery"
          className="mt-1.5 w-full bg-canvas border border-line-hi rounded-sm px-3 py-2 text-sm
                     placeholder:text-ghost
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-subtle">
          Per exercise
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {[
            { v: true, title: "Many", sub: "Like body area" },
            { v: false, title: "One", sub: "Like difficulty" },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setMultiValued(o.v)}
              className={`border rounded-sm p-2.5 text-left
                          focus:outline-none focus:ring-1 focus:ring-accent
                          ${multiValued === o.v
                            ? "border-accent bg-accent text-on-accent font-medium"
                            : "border-line text-muted hover:border-line-hi2"}`}
            >
              <span className="block text-sm">{o.title}</span>
              <span
                className={`block text-[11px] mt-0.5 ${
                  multiValued === o.v ? "text-on-accent/80 font-normal" : "text-faint"
                }`}
              >
                {o.sub}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className={CANCEL}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!label.trim()}
            className="flex-1 bg-accent text-on-accent rounded-sm py-2.5 text-sm font-medium
                       hover:bg-accent-hi disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-accent
                       focus:ring-offset-2 focus:ring-offset-surface"
          >
            Create
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

/**
 * Rule slots are the surprising one. Their tags are ANDed, so removing a tag
 * makes the rule match *more* exercises rather than fewer — worth saying out
 * loud, because nothing else in the app would tell you it happened.
 */
function describeDeletion(value, used = { exercises: 0, rules: 0 }) {
  const parts = [];
  if (used.exercises) {
    parts.push(
      `It's removed from ${used.exercises} exercise${used.exercises === 1 ? "" : "s"}.`
    );
  }
  if (used.rules) {
    parts.push(
      `${used.rules} rule slot${used.rules === 1 ? "" : "s"} match on it — dropping it makes ` +
        `${used.rules === 1 ? "that rule" : "those rules"} broader, since rule tags are ANDed.`
    );
  }
  if (!parts.length) parts.push("Nothing is tagged with it.");
  parts.push("If it's equipment, it also leaves your kit list.");
  return parts.join(" ");
}
