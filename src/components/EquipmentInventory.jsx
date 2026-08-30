import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Check, Ruler } from "lucide-react";
import {
  fetchEquipment, setEquipmentOwned, fetchAvailability,
  fetchPrefs, savePrefs,
} from "../lib/data";

/**
 * What the user owns. Marking a thing owned is what turns "you can't do this"
 * into a workable exercise, so the count of what each piece unlocks is shown
 * alongside — otherwise it's a checklist with no visible consequence.
 */
export default function EquipmentInventory({ onBack }) {
  const [items, setItems] = useState([]);
  const [availability, setAvailability] = useState({});
  const [unit, setUnit] = useState("mi");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    try {
      const [equipment, avail, prefs] = await Promise.all([
        fetchEquipment(),
        fetchAvailability(),
        fetchPrefs(),
      ]);
      setItems(equipment);
      setAvailability(avail);
      setUnit(prefs.distanceUnit);
    } catch (e) {
      setError(e.message ?? "Couldn't load your equipment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (item) => {
    setSaving(item.id);
    // Optimistic: the checkbox should feel instant even on a slow connection.
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, owned: !i.owned } : i))
    );
    try {
      await setEquipmentOwned(item.id, !item.owned);
      setAvailability(await fetchAvailability());
    } catch (e) {
      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, owned: item.owned } : i))
      );
      setError(e.message ?? "Couldn't save that.");
    } finally {
      setSaving(null);
    }
  };

  const changeUnit = async (next) => {
    setUnit(next);
    try {
      await savePrefs({ distanceUnit: next });
    } catch {
      /* a display preference isn't worth an error banner */
    }
  };

  // How many exercises each piece of kit is the only thing standing in the way of.
  const unlockCount = (label) =>
    Object.values(availability).filter(
      (a) => !a.canDo && a.missing.length === 1 && a.missing[0] === label
    ).length;

  const blocked = Object.values(availability).filter((a) => !a.canDo).length;

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

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Equipment</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          What you have to hand. Exercises needing anything you don't own are flagged rather than
          hidden — you might borrow a band.
        </p>

        {loading && <p className="mt-6 text-sm text-subtle">Loading…</p>}
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}

        {!loading && (
          <>
            <ul className="mt-7 divide-y divide-line border-y border-line">
              {items.map((item) => {
                const unlocks = unlockCount(item.label);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item)}
                      disabled={saving === item.id}
                      aria-pressed={item.owned}
                      className="w-full text-left py-4 flex items-center gap-4
                                 hover:bg-surface/60 disabled:opacity-60
                                 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <span
                        className={`w-8 h-8 shrink-0 rounded-sm border-2 grid place-items-center
                                    ${item.owned
                                      ? "border-accent bg-accent text-on-accent"
                                      : "border-line-hi"}`}
                      >
                        {item.owned && <Check size={17} strokeWidth={3} />}
                      </span>

                      <span className="flex-1">
                        <span className={item.owned ? "" : "text-muted"}>{item.label}</span>
                        {!item.owned && unlocks > 0 && (
                          <span className="block text-xs text-warn/80 mt-0.5">
                            {unlocks} {unlocks === 1 ? "exercise needs" : "exercises need"} this
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {blocked > 0 && (
              <p className="mt-4 text-xs text-subtle">
                {blocked} {blocked === 1 ? "exercise is" : "exercises are"} currently out of reach.
                Open one to see what you could do instead.
              </p>
            )}

            {/* Not equipment, but it belongs with the other things you set once. */}
            <div className="mt-10">
              <p className="text-[11px] uppercase tracking-[0.25em] text-subtle">
                <Ruler size={11} className="inline mr-1.5 -mt-0.5" />
                Distance in
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { v: "mi", label: "Miles" },
                  { v: "km", label: "Kilometres" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => changeUnit(o.v)}
                    className={`border-2 rounded-sm py-3 text-sm
                                focus:outline-none focus:ring-1 focus:ring-accent
                                ${unit === o.v
                                  ? "border-accent text-accent-hi"
                                  : "border-line text-muted hover:border-line-hi2"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-faint">
                Distances are stored in metres either way, so switching this never changes what
                your history says you did.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
