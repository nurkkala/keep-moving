/**
 * Every read and write the app needs, in the shapes the component uses.
 * Nothing here knows about React; nothing in the component needs to know
 * about Postgres.
 *
 * Row level security scopes all of this to the signed-in user, so almost
 * nothing below filters on user_id by hand — the database does it.
 */

import { supabase } from "./supabase";

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Not signed in.");
  return data.user;
}

/* ============================================================ exercise catalog */

const EXERCISE_SELECT = `
  id, user_id, name, description, instructions, video_url, kind,
  suggested_type, suggested_value, suggested_sets,
  tags:exercise_attributes (
    value:attribute_values ( id, key, label, type:attribute_types ( key, label ) )
  )
`;

/**
 * Flattens the nested tag rows into something a component can render:
 *   { body_area: [{ id, key, label }], condition: [...] }
 */
function shapeExercise(row) {
  const attributes = {};
  for (const t of row.tags ?? []) {
    const v = t.value;
    if (!v?.type) continue;
    (attributes[v.type.key] ??= []).push({ id: v.id, key: v.key, label: v.label });
  }
  for (const list of Object.values(attributes)) {
    list.sort((a, b) => a.label.localeCompare(b.label));
  }

  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    description: row.description ?? "",
    instructions: row.instructions ?? "",
    videoUrl: row.video_url ?? null,
    // The library's recommendation for someone who has never done this —
    // NOT anyone's target. A user's target lives in exercise_targets.
    suggestedType: row.suggested_type,
    suggestedValue: row.suggested_value,
    suggestedSets: row.suggested_sets,
    builtIn: row.user_id === null,
    attributes,
  };
}

/**
 * The exercise library. Built-in exercises plus the user's own.
 *
 *   fetchExercises()                                  // everything
 *   fetchExercises({ search: "plank" })               // name match
 *   fetchExercises({ valueKeys: ["sciatica"] })       // tagged for sciatica
 *   fetchExercises({ valueKeys: ["core", "glutes"] }) // core OR glutes
 *
 * valueKeys matches ANY of the keys given, across every attribute axis.
 */
export async function fetchExercises({ valueKeys = [], search = "" } = {}) {
  let ids = null;

  if (valueKeys.length) {
    const { data, error } = await supabase
      .from("exercise_tags")
      .select("exercise_id")
      .in("value_key", valueKeys);
    if (error) throw error;

    ids = [...new Set((data ?? []).map((r) => r.exercise_id))];
    if (!ids.length) return [];
  }

  let query = supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .order("sort_order")
    .order("name");
  if (ids) query = query.in("id", ids);
  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(shapeExercise);
}

export async function fetchExercise(id) {
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? shapeExercise(data) : null;
}

/** Creates a user-owned exercise. `valueIds` are attribute_values ids. */
export async function createExercise(ex, valueIds = []) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: ex.name,
      kind: ex.kind,
      description: ex.description || null,
      instructions: ex.instructions || null,
      video_url: ex.videoUrl || null,
      suggested_type: ex.suggestedType,
      suggested_value: ex.suggestedValue,
      suggested_sets: ex.suggestedSets ?? 1,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (valueIds.length) await setExerciseTags(data.id, valueIds);

  return fetchExercise(data.id);
}

/** Built-in exercises are read-only; RLS will reject an update to one. */
export async function updateExercise(id, patch) {
  const row = {};
  if ("name" in patch) row.name = patch.name;
  if ("kind" in patch) row.kind = patch.kind;
  if ("description" in patch) row.description = patch.description || null;
  if ("instructions" in patch) row.instructions = patch.instructions || null;
  if ("videoUrl" in patch) row.video_url = patch.videoUrl || null;
  if ("suggestedType" in patch) row.suggested_type = patch.suggestedType;
  if ("suggestedValue" in patch) row.suggested_value = patch.suggestedValue;
  if ("suggestedSets" in patch) row.suggested_sets = patch.suggestedSets;

  const { error } = await supabase.from("exercises").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteExercise(id) {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}

/** Replaces the whole tag set for one exercise. */
export async function setExerciseTags(exerciseId, valueIds) {
  const { error: clearError } = await supabase
    .from("exercise_attributes")
    .delete()
    .eq("exercise_id", exerciseId);
  if (clearError) throw clearError;

  if (!valueIds.length) return;

  const { error } = await supabase
    .from("exercise_attributes")
    .insert(valueIds.map((value_id) => ({ exercise_id: exerciseId, value_id })));
  if (error) throw error;
}

/* ======================================================= attribute vocabulary */

/**
 * The axes and their allowed values, for building pickers:
 *   [{ key: "body_area", label: "Body area", multiValued: true,
 *      values: [{ id, key, label }] }, ...]
 */
export async function fetchAttributeTypes() {
  const { data, error } = await supabase
    .from("attribute_types")
    .select(
      "id, key, label, multi_valued, position, user_id, values:attribute_values (id, key, label, description, position, user_id)"
    )
    .order("position");

  if (error) throw error;

  return (data ?? []).map((t) => ({
    id: t.id,
    key: t.key,
    label: t.label,
    multiValued: t.multi_valued,
    builtIn: t.user_id === null,
    values: (t.values ?? [])
      .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
      // Null user_id means built-in: readable by everyone, editable by nobody.
      // Callers need this to avoid offering an edit that RLS will reject.
      .map((v) => ({
        id: v.id,
        key: v.key,
        label: v.label,
        description: v.description ?? "",
        builtIn: v.user_id === null,
      })),
  }));
}

/**
 * A new axis — "phase of recovery", "practitioner" — owned by this user.
 * The schema was built for this: it's an INSERT, not a migration.
 */
export async function createAttributeType(key, label, multiValued = true) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("attribute_types")
    .insert({ user_id: user.id, key, label, multi_valued: multiValued })
    .select("id, key, label, multi_valued")
    .single();
  if (error) throw error;
  return data;
}

/** Renames one of your own axes. `key` is left alone for the usual reason. */
export async function updateAttributeType(id, patch) {
  const row = {};
  if ("label" in patch) row.label = patch.label;
  if ("multiValued" in patch) row.multi_valued = patch.multiValued;

  const { error } = await supabase.from("attribute_types").update(row).eq("id", id);
  if (error) throw error;
}

/**
 * Deletes one of your own axes and every value on it — which in turn drops
 * those tags from exercises and rule slots. Much bigger than deleting a single
 * value; say so before calling.
 */
export async function deleteAttributeType(id) {
  const { error } = await supabase.from("attribute_types").delete().eq("id", id);
  if (error) throw error;
}

/** Adds a value the built-in vocabulary is missing, owned by this user. */
export async function createAttributeValue(typeId, key, label, description = "") {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("attribute_values")
    .insert({ type_id: typeId, user_id: user.id, key, label, description: description || null })
    .select("id, key, label, description")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Renames one of your own values. Built-ins have `user_id is null` and RLS
 * rejects the write — the caller should not offer it rather than let it fail.
 *
 * `key` is what rules and tags match on, so changing it is a bigger deal than
 * changing `label`; callers should generally only pass `label`.
 */
export async function updateAttributeValue(id, patch) {
  const row = {};
  if ("key" in patch) row.key = patch.key;
  if ("label" in patch) row.label = patch.label;
  if ("description" in patch) row.description = patch.description || null;

  const { error } = await supabase.from("attribute_values").update(row).eq("id", id);
  if (error) throw error;
}

/**
 * Deletes one of your own values.
 *
 * Three things cascade, and the second is easy to miss: the tag comes off
 * every exercise carrying it, it comes off any rule slot matching on it —
 * which *widens* that rule, since rule tags are ANDed — and it disappears from
 * your equipment. Check `fetchAttributeUsage` and say so before calling this.
 */
export async function deleteAttributeValue(id) {
  const { error } = await supabase.from("attribute_values").delete().eq("id", id);
  if (error) throw error;
}

/**
 * How many exercises and rule slots reference each value, keyed by value id.
 * Row level security already scopes both sides to what you can see, so the
 * counts are what deleting would actually affect for you.
 */
export async function fetchAttributeUsage() {
  const [tags, slots] = await Promise.all([
    supabase.from("exercise_attributes").select("value_id"),
    supabase.from("workout_slot_tags").select("value_id"),
  ]);
  if (tags.error) throw tags.error;
  if (slots.error) throw slots.error;

  const usage = {};
  const bump = (id, field) => {
    usage[id] ??= { exercises: 0, rules: 0 };
    usage[id][field] += 1;
  };
  for (const r of tags.data ?? []) bump(r.value_id, "exercises");
  for (const r of slots.data ?? []) bump(r.value_id, "rules");
  return usage;
}

/* =================================================================== workouts */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const METRES_PER_MILE = 1609.344;

/** Distance is stored in metres; this is only ever a display concern. */
export function formatDistance(metres, unit = "mi", { long = false } = {}) {
  if (metres == null) return "";

  const value = unit === "km" ? metres / 1000 : metres / METRES_PER_MILE;
  // Under a tenth reads better as the raw unit than as "0.1".
  const rounded = value < 0.95 ? value.toFixed(2) : value.toFixed(1).replace(/\.0$/, "");

  if (!long) return `${rounded} ${unit}`;
  return `${rounded} ${unit === "km" ? "kilometres" : "miles"}`;
}

/** Turns a typed distance back into metres for storage. */
export function toMetres(value, unit = "mi") {
  return Math.round(unit === "km" ? value * 1000 : value * METRES_PER_MILE);
}

/**
 * Metres to a number suitable for an input box in the user's unit.
 *
 * Two decimal places, so a metres → miles → metres roundtrip is lossy by up
 * to ~16 m. That's why the target sheet only writes back when the field is
 * actually edited: opening and closing it must not nudge the number.
 */
export function fromMetres(metres, unit = "mi") {
  if (metres == null) return "";
  const v = unit === "km" ? metres / 1000 : metres / METRES_PER_MILE;
  return Math.round(v * 100) / 100;
}

/**
 * A target rendered for reading: "45s", "12× · 3 sets", "3.1 mi". Hold times
 * and per-side counts are cues, not targets — they live in the exercise's
 * instructions and get spoken, not measured.
 */
export function describeTarget(
  { targetType, targetValue, sets = 1 },
  { long = false, unit = "mi" } = {}
) {
  if (targetValue == null) return "";

  let one;
  if (targetType === "time") {
    one = long ? `${targetValue} seconds` : `${targetValue}s`;
  } else if (targetType === "distance") {
    one = formatDistance(targetValue, unit, { long });
  } else {
    one = long ? `${targetValue} reps` : `${targetValue}×`;
  }

  if (!sets || sets <= 1) return one;
  return long ? `${one}, ${sets} sets` : `${one} · ${sets} sets`;
}

/** "8:12 / mi" — only meaningful for a distance set that was actually done. */
export function describePace(metres, seconds, unit = "mi") {
  if (!metres || !seconds) return "";
  const per = unit === "km" ? 1000 : METRES_PER_MILE;
  const secsPerUnit = seconds / (metres / per);
  const m = Math.floor(secsPerUnit / 60);
  const sec = Math.round(secsPerUnit % 60);
  return `${m}:${String(sec).padStart(2, "0")} / ${unit}`;
}

/** "All sets together" vs "One set of each, in rotation". */
export function describeOrderMode(mode) {
  return mode === "circuit" ? "Circuit" : "Straight sets";
}

/** "Mon, Wed, Fri" · "Every day" · "Not scheduled" */
export function describeDays(days = []) {
  if (!days.length) return "Not scheduled";
  if (days.length === 7) return "Every day";

  const sorted = [...days].sort((a, b) => a - b);
  const isWeekdays = sorted.join() === "1,2,3,4,5";
  const isWeekends = sorted.join() === "0,6";
  if (isWeekdays) return "Weekdays";
  if (isWeekends) return "Weekends";

  return sorted.map((d) => DAY_NAMES[d].slice(0, 3)).join(", ");
}

function shapeWorkout(w) {
  return {
    id: w.id,
    name: w.name,
    description: w.description ?? "",
    days: w.days_of_week ?? [],
    daysLabel: describeDays(w.days_of_week ?? []),
    orderMode: w.order_mode ?? "straight",
    restSec: w.rest_sec ?? null,
    position: w.position,
    slotCount: w.slot_count ?? 0,
    exerciseCount: w.exercise_count ?? 0,
    estWorkSec: w.est_work_sec ?? 0,
    missingEquipment: w.missing_equipment ?? 0,
  };
}

/** All workouts with counts and a rough duration, for the picker screen. */
export async function fetchWorkouts() {
  const { data, error } = await supabase
    .from("workout_summaries")
    .select("*")
    .order("position");

  if (error) throw error;
  return (data ?? []).map(shapeWorkout);
}

/** Workouts scheduled for a given weekday. Defaults to today, in local time. */
export async function fetchWorkoutsForDay(dayOfWeek = new Date().getDay()) {
  const { data, error } = await supabase
    .from("workout_summaries")
    .select("*")
    .contains("days_of_week", [dayOfWeek])
    .order("position");

  if (error) throw error;
  return (data ?? []).map(shapeWorkout);
}

export async function createWorkout(workout) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      name: workout.name,
      description: workout.description || null,
      days_of_week: workout.days ?? [],
      order_mode: workout.orderMode ?? "straight",
      rest_sec: workout.restSec ?? null,
      position: workout.position ?? 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateWorkout(id, patch) {
  const row = {};
  if ("name" in patch) row.name = patch.name;
  if ("description" in patch) row.description = patch.description || null;
  if ("days" in patch) row.days_of_week = patch.days;
  if ("orderMode" in patch) row.order_mode = patch.orderMode;
  if ("restSec" in patch) row.rest_sec = patch.restSec ?? null;
  if ("position" in patch) row.position = patch.position;

  const { error } = await supabase.from("workouts").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteWorkout(id) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------- the exercises inside a workout */

/**
 * A workout's exercises, one row per exercise, with each user's own target
 * resolved in (falling back to the library's suggestion where they haven't
 * set one). This is the editor's view of a workout.
 */
export async function fetchWorkoutExercises(workoutId) {
  const { data, error } = await supabase
    .from("workout_exercises_resolved")
    .select("*")
    .eq("workout_id", workoutId)
    .order("position");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    name: r.name,
    kind: r.kind,
    targetType: r.target_type,
    targetValue: r.target_value,
    sets: r.sets,
    description: r.description ?? "",
    // The coach speaks `cue`: the slot's own note if it has one, otherwise
    // the exercise's instructions.
    cue: r.note || r.instructions || "",
    note: r.note ?? "",
    videoUrl: r.video_url ?? null,
    // False means this is still the library's suggestion, not a target the
    // user has chosen — worth showing differently in an editor.
    targetIsPersonal: r.target_is_personal,
    targetSetAt: r.target_set_at ?? null,
  }));
}

/**
 * The sequence the coach actually walks: one entry per SET, already ordered
 * for the workout's mode. Straight sets finish an exercise before moving on;
 * a circuit rotates. The timer just iterates this and never branches on mode.
 */
export async function fetchWorkoutSequence(workoutId) {
  const { data, error } = await supabase.rpc("workout_sequence", {
    target_workout: workoutId,
  });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    ordinal: r.ordinal,
    setNumber: r.set_number,
    totalSets: r.total_sets,
    exerciseId: r.exercise_id,
    name: r.name,
    kind: r.kind,
    targetType: r.target_type,
    targetValue: r.target_value,
    cue: r.note || r.instructions || "",
    isLastSet: r.set_number === r.total_sets,
    // True when a rule slot chose this exercise rather than the user pinning it.
    fromRule: r.from_rule,
  }));
}

/**
 * A workout's slots for the editor: fixed exercises and rule slots together.
 * A rule slot has no exercise — it says "pick N with these tags", and which
 * exercises that means isn't known until a session starts.
 */
export async function fetchWorkoutSlots(workoutId) {
  const { data, error } = await supabase
    .from("workout_slots")
    .select("*")
    .eq("workout_id", workoutId)
    .order("position");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    isRule: r.is_rule,
    exerciseId: r.exercise_id,
    pickCount: r.pick_count,
    tags: r.tags ?? [],
    name: r.name,
    kind: r.kind,
    targetType: r.target_type,
    targetValue: r.target_value,
    sets: r.sets,
    targetIsPersonal: r.target_is_personal,
    note: r.note ?? "",
  }));
}

/** "2 × Arms" / "1 × Lower back + Strength" */
export function describeRule(slot) {
  const labels = (slot.tags ?? []).map((t) => t.label);
  const what = labels.length ? labels.join(" + ") : "any exercise";
  return `${slot.pickCount} × ${what}`;
}

/**
 * Replaces a workout's slots, atomically. Each is either a fixed exercise or
 * a rule; the RPC rejects a slot that tries to be both.
 */
export async function saveWorkoutExercises(workoutId, list) {
  const items = list.map((slot) =>
    slot.isRule
      ? {
          pick_count: slot.pickCount ?? 1,
          tag_ids: (slot.tags ?? []).map((t) => t.id),
          note: slot.note || null,
        }
      : { exercise_id: slot.exerciseId, note: slot.note || null }
  );

  const { error } = await supabase.rpc("save_workout_exercises", {
    target_workout: workoutId,
    items,
  });
  if (error) throw error;
}

/**
 * What a workout resolves to right now. Rule slots pick their exercises on
 * each call — least-recently-performed first — so this varies between calls
 * by design. Use it to preview; the session gets its own resolution.
 */
export async function previewWorkout(workoutId) {
  const { data, error } = await supabase.rpc("resolve_workout", {
    target_workout: workoutId,
  });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    ordinal: r.ordinal,
    slotId: r.slot_id,
    exerciseId: r.exercise_id,
    fromRule: r.from_rule,
    note: r.note ?? "",
  }));
}

/** First run: creates a weekday workout from the shared library. */
export async function fetchOrSeedWorkouts() {
  const existing = await fetchWorkouts();
  if (existing.length) return existing;

  const { error } = await supabase.rpc("seed_default_workout");
  if (error) throw error;

  return fetchWorkouts();
}

/* ==================================================================== targets */

/**
 * What this user is aiming for on a given exercise. One row per exercise —
 * a target is current state, not a log. The record of what you actually did
 * lives in session history, which is where progression is read from.
 */
export async function fetchTargets() {
  const { data, error } = await supabase
    .from("exercise_targets")
    .select("exercise_id, target_type, target_value, sets, note, updated_at");

  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((t) => [
      t.exercise_id,
      {
        targetType: t.target_type,
        targetValue: t.target_value,
        sets: t.sets,
        note: t.note ?? "",
        updatedAt: t.updated_at,
      },
    ])
  );
}

/** Sets or changes a target. Upserts — one target per exercise. */
export async function setExerciseTarget(exerciseId, { targetType, targetValue, sets = 1, note = null }) {
  const { error } = await supabase.rpc("set_exercise_target", {
    target_exercise: exerciseId,
    new_type: targetType,
    new_value: targetValue,
    new_sets: sets,
    new_note: note,
  });
  if (error) throw error;
}

/** Reverts to the library's suggestion by removing the personal target. */
export async function clearExerciseTarget(exerciseId) {
  const { error } = await supabase
    .from("exercise_targets")
    .delete()
    .eq("exercise_id", exerciseId);
  if (error) throw error;
}

/* ==================================================================== history */

/**
 * Past sessions, newest first. Session items are stored one per SET, so this
 * rolls them up per exercise — the resolution a history list wants. Use
 * fetchPerformanceHistory for the set-by-set detail.
 */
export async function fetchHistory(limit = 40) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, performed_at, total_sec, workout_id, workout_name, order_mode")
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data?.length) return [];

  // One follow-up query for the whole page rather than one per session.
  const { data: totals, error: totalsError } = await supabase
    .from("session_exercise_totals")
    .select("*")
    .in("session_id", data.map((s) => s.id))
    .order("first_position");

  if (totalsError) throw totalsError;

  const bySession = new Map();
  for (const t of totals ?? []) {
    if (!bySession.has(t.session_id)) bySession.set(t.session_id, []);
    bySession.get(t.session_id).push({
      exerciseId: t.exercise_id,
      name: t.name,
      kind: t.kind,
      targetType: t.target_type,
      targetValue: t.target_value,
      targetSets: t.target_sets,
      setsDone: t.sets_done,
      totalValue: t.total_value,
      bestSet: t.best_set,
      totalSec: t.total_sec,
      metEverySet: t.met_every_set,
    });
  }

  return data.map((s) => ({
    id: s.id,
    at: new Date(s.performed_at).getTime(),
    totalSec: s.total_sec,
    workoutId: s.workout_id,
    // Snapshots taken at the time, so renaming a workout or switching its
    // mode doesn't rewrite what your history says you did.
    workoutName: s.workout_name ?? null,
    orderMode: s.order_mode ?? null,
    items: bySession.get(s.id) ?? [],
  }));
}

/**
 * Set-by-set detail for one exercise over time — the shape a progress chart
 * wants. Each row carries the target as it stood that day, so raising a
 * target never turns a past success into a shortfall.
 */
export async function fetchPerformanceHistory(exerciseId, limit = 200) {
  const { data, error } = await supabase
    .from("performance_history")
    .select("*")
    .eq("exercise_id", exerciseId)
    .order("performed_at", { ascending: false })
    .order("position", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    sessionId: r.session_id,
    at: new Date(r.performed_at).getTime(),
    workoutName: r.workout_name,
    orderMode: r.order_mode,
    setNumber: r.set_number,
    targetType: r.target_type,
    targetValue: r.target_value,
    targetSets: r.target_sets,
    actualValue: r.actual_value,
    actualSec: r.actual_sec,
    skipped: r.skipped,
    how: r.how,
    metTarget: r.met_target,
  }));
}

/** Personal bests, drawn from what was done — they survive a target change. */
export async function fetchBests() {
  const { data, error } = await supabase.from("exercise_bests").select("*");
  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((b) => [
      b.exercise_id,
      {
        name: b.name,
        targetType: b.target_type,
        bestSet: b.best_set,
        setsPerformed: b.sets_performed,
        timesPerformed: b.times_performed,
        lastPerformed: b.last_performed ? new Date(b.last_performed).getTime() : null,
      },
    ])
  );
}

/**
 * Writes a finished session. `items` is one entry per SET, in the order they
 * were performed — which in a circuit interleaves exercises.
 *
 * Name, kind, and the target are snapshotted per set, so history stays
 * truthful after an exercise is renamed or a target is raised.
 */
export async function saveSession({ totalSec, items, workoutId = null, orderMode = null }) {
  const payload = items.map((it) => ({
    exercise_id: it.exerciseId ?? null,
    name: it.name,
    kind: it.kind,
    set_number: it.setNumber ?? 1,
    target_type: it.targetType ?? null,
    target_value: it.targetValue ?? null,
    target_sets: it.targetSets ?? null,
    // Performance in the target's unit: reps completed, or seconds held.
    actual_value: it.actualValue ?? null,
    // Wall-clock time on this set, whatever the unit.
    actual: Math.round(it.actualSec ?? 0),
    skipped: !!it.skipped,
    how: it.how ?? null,
  }));

  const { data: newId, error } = await supabase.rpc("save_session", {
    total_sec: Math.round(totalSec),
    items: payload,
    target_workout: workoutId,
    mode: orderMode,
  });
  if (error) throw error;

  return { id: newId, at: Date.now(), totalSec: Math.round(totalSec) };
}

export async function deleteSession(id) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function clearHistory() {
  const user = await requireUser();
  const { error } = await supabase.from("sessions").delete().eq("user_id", user.id);
  if (error) throw error;
}

/** All-time seconds per category, aggregated in Postgres. */
export async function fetchKindTotals() {
  const { data, error } = await supabase.from("kind_totals").select("kind, total_sec");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.kind, r.total_sec]));
}

/* ================================================================== equipment */

/**
 * Equipment isn't a separate concept — it's the 'equipment' attribute axis.
 * These functions are about what the user OWNS, which is separate from what
 * an exercise NEEDS.
 */
export async function fetchEquipment() {
  const [axes, owned] = await Promise.all([
    fetchAttributeTypes(),
    supabase.from("user_equipment").select("value_id"),
  ]);
  if (owned.error) throw owned.error;

  const have = new Set((owned.data ?? []).map((r) => r.value_id));
  const axis = axes.find((a) => a.key === "equipment");

  return (axis?.values ?? [])
    // "No equipment" isn't something you can own or lack.
    .filter((v) => v.key !== "none")
    .map((v) => ({ ...v, owned: have.has(v.id) }));
}

export async function setEquipmentOwned(valueId, owned) {
  if (owned) {
    const user = await requireUser();
    const { error } = await supabase
      .from("user_equipment")
      .upsert({ user_id: user.id, value_id: valueId }, { onConflict: "user_id,value_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_equipment").delete().eq("value_id", valueId);
    if (error) throw error;
  }
}

/** Per exercise: what it needs, what's missing, whether it's doable. */
export async function fetchAvailability() {
  const { data, error } = await supabase.from("exercise_availability").select("*");
  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.exercise_id,
      { needs: r.needs ?? [], missing: r.missing ?? [], canDo: r.can_do },
    ])
  );
}

/**
 * Everything a workout's fixed slots call for. Rule slots are excluded —
 * which exercises they pick isn't known until the session starts, so their
 * kit can't be promised in advance.
 */
export async function fetchWorkoutEquipment(workoutId) {
  const { data, error } = await supabase
    .from("workout_equipment")
    .select("value_id, label, owned, used_by")
    .eq("workout_id", workoutId)
    .order("label");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.value_id,
    label: r.label,
    owned: r.owned,
    usedBy: r.used_by,
  }));
}

/**
 * The same thing for every workout at once, keyed by workout id.
 *
 * `workout_summaries.missing_equipment` is only a count, and the picker wants
 * to name what's missing rather than say "missing kit" and make you open the
 * workout to find out. One query beats one per card.
 */
export async function fetchEquipmentByWorkout() {
  const { data, error } = await supabase
    .from("workout_equipment")
    .select("workout_id, value_id, label, owned, used_by")
    .order("label");

  if (error) throw error;

  const byWorkout = {};
  for (const r of data ?? []) {
    (byWorkout[r.workout_id] ??= []).push({
      id: r.value_id,
      label: r.label,
      owned: r.owned,
      usedBy: r.used_by,
    });
  }
  return byWorkout;
}

/** Things you can do instead, working the same area. */
export async function fetchAlternatives(exerciseId, want = 3) {
  const { data, error } = await supabase.rpc("suggest_alternatives", {
    target_exercise: exerciseId,
    want,
  });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    exerciseId: r.exercise_id,
    name: r.name,
    kind: r.kind,
    sharedAreas: r.shared_areas,
    sameKind: r.same_kind,
    needs: r.needs ?? [],
  }));
}

/* ================================================================ preferences */

const PREF_DEFAULTS = {
  voiceURI: null, voiceName: null, rate: 1, restSec: 15, distanceUnit: "mi",
  theme: "system",
};

export async function fetchPrefs() {
  const { data, error } = await supabase
    .from("preferences")
    .select("voice_uri, voice_name, rate, rest_sec, distance_unit, theme")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ...PREF_DEFAULTS };

  return {
    voiceURI: data.voice_uri,
    voiceName: data.voice_name,
    rate: Number(data.rate),
    restSec: data.rest_sec,
    distanceUnit: data.distance_unit ?? "mi",
    theme: data.theme ?? "system",
  };
}

/** Accepts any subset: savePrefs({ restSec: 20 }) leaves the voice alone. */
export async function savePrefs(partial) {
  const user = await requireUser();
  const row = { user_id: user.id, updated_at: new Date().toISOString() };

  if ("voiceURI" in partial) row.voice_uri = partial.voiceURI;
  if ("voiceName" in partial) row.voice_name = partial.voiceName;
  if ("rate" in partial) row.rate = partial.rate;
  if ("restSec" in partial) row.rest_sec = partial.restSec;
  if ("distanceUnit" in partial) row.distance_unit = partial.distanceUnit;
  if ("theme" in partial) row.theme = partial.theme;

  const { error } = await supabase.from("preferences").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
