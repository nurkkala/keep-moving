/**
 * Every read and write the coach needs, in the shapes the component uses.
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
  default_type, default_seconds, default_reps,
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
    type: row.default_type,
    seconds: row.default_seconds,
    reps: row.default_reps,
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

  let query = supabase.from("exercises").select(EXERCISE_SELECT).order("name");
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
      default_type: ex.type,
      default_seconds: ex.type === "time" ? ex.seconds : null,
      default_reps: ex.type === "reps" ? ex.reps : null,
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
  if ("type" in patch) {
    row.default_type = patch.type;
    row.default_seconds = patch.type === "time" ? patch.seconds : null;
    row.default_reps = patch.type === "reps" ? patch.reps : null;
  }

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
    .select("id, key, label, multi_valued, position, values:attribute_values (id, key, label, position)")
    .order("position");

  if (error) throw error;

  return (data ?? []).map((t) => ({
    id: t.id,
    key: t.key,
    label: t.label,
    multiValued: t.multi_valued,
    values: (t.values ?? [])
      .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
      .map((v) => ({ id: v.id, key: v.key, label: v.label })),
  }));
}

/** Adds a value the built-in vocabulary is missing, owned by this user. */
export async function createAttributeValue(typeId, key, label) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("attribute_values")
    .insert({ type_id: typeId, user_id: user.id, key, label })
    .select("id, key, label")
    .single();
  if (error) throw error;
  return data;
}

/* =================================================================== workouts */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
    timeOfDay: w.time_of_day ?? null,
    restSec: w.rest_sec ?? null,
    startsOn: w.starts_on ?? null,
    endsOn: w.ends_on ?? null,
    archived: w.archived,
    position: w.position,
    exerciseCount: w.exercise_count ?? 0,
    estWorkSec: w.est_work_sec ?? 0,
  };
}

/** All workouts with counts and a rough duration, for the picker screen. */
export async function fetchWorkouts({ includeArchived = false } = {}) {
  let query = supabase.from("workout_summaries").select("*").order("position");
  if (!includeArchived) query = query.eq("archived", false);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(shapeWorkout);
}

/** Workouts scheduled for a given weekday. Defaults to today, in local time. */
export async function fetchWorkoutsForDay(dayOfWeek = new Date().getDay()) {
  const { data, error } = await supabase
    .from("workout_summaries")
    .select("*")
    .eq("archived", false)
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
      time_of_day: workout.timeOfDay || null,
      rest_sec: workout.restSec ?? null,
      starts_on: workout.startsOn || null,
      ends_on: workout.endsOn || null,
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
  if ("timeOfDay" in patch) row.time_of_day = patch.timeOfDay || null;
  if ("restSec" in patch) row.rest_sec = patch.restSec ?? null;
  if ("startsOn" in patch) row.starts_on = patch.startsOn || null;
  if ("endsOn" in patch) row.ends_on = patch.endsOn || null;
  if ("archived" in patch) row.archived = patch.archived;
  if ("position" in patch) row.position = patch.position;

  const { error } = await supabase.from("workouts").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteWorkout(id) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------- the exercises inside a workout */

/** One workout's list, with overrides already resolved by the database. */
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
    type: r.type,
    seconds: r.seconds,
    reps: r.reps,
    sets: r.sets ?? 1,
    description: r.description ?? "",
    // The coach speaks `cue`: the slot's own note if it has one, otherwise
    // the exercise's instructions.
    cue: r.note || r.instructions || "",
    note: r.note ?? "",
    videoUrl: r.video_url ?? null,
    // Null here means "tracking the exercise default" — useful in the editor.
    overrideType: r.override_type,
    overrideSeconds: r.override_seconds,
    overrideReps: r.override_reps,
  }));
}

/**
 * Replaces a workout's exercise list, atomically. Only overrides are stored —
 * leave them null and the slot tracks the exercise's defaults.
 */
export async function saveWorkoutExercises(workoutId, list) {
  const items = list.map((slot) => ({
    exercise_id: slot.exerciseId,
    type: slot.overrideType ?? null,
    seconds: slot.overrideSeconds ?? null,
    reps: slot.overrideReps ?? null,
    sets: slot.sets && slot.sets > 1 ? slot.sets : null,
    note: slot.note || null,
  }));

  const { error } = await supabase.rpc("save_workout_exercises", {
    target_workout: workoutId,
    items,
  });
  if (error) throw error;
}

/** First run: creates a weekday workout from the shared library. */
export async function fetchOrSeedWorkouts() {
  const existing = await fetchWorkouts();
  if (existing.length) return existing;

  const { error } = await supabase.rpc("seed_default_workout");
  if (error) throw error;

  return fetchWorkouts();
}

/* ==================================================================== history */

export async function fetchHistory(limit = 40) {
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, performed_at, total_sec, workout_id, workout_name, session_items ( name, kind, actual_sec, skipped, position, exercise_id )"
    )
    .order("performed_at", { ascending: false })
    .order("position", { referencedTable: "session_items", ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((s) => ({
    id: s.id,
    at: new Date(s.performed_at).getTime(),
    totalSec: s.total_sec,
    workoutId: s.workout_id,
    // Snapshot of the name at the time, so a renamed workout doesn't rewrite
    // what your history says you did.
    workoutName: s.workout_name ?? null,
    items: (s.session_items ?? []).map((it) => ({
      name: it.name,
      kind: it.kind,
      actual: it.actual_sec,
      skipped: it.skipped,
      exerciseId: it.exercise_id,
    })),
  }));
}

/**
 * Writes a finished session and its items together. Name and kind are stored
 * as a snapshot, so renaming or deleting an exercise later doesn't rewrite
 * what happened.
 */
export async function saveSession({ totalSec, items, workoutId = null }) {
  const payload = items.map((it) => ({
    exercise_id: it.exerciseId ?? null,
    name: it.name,
    kind: it.kind,
    actual: Math.round(it.actual ?? 0),
    skipped: !!it.skipped,
    how: it.how ?? null,
  }));

  const { data: newId, error } = await supabase.rpc("save_session", {
    total_sec: Math.round(totalSec),
    items: payload,
    target_workout: workoutId,
  });
  if (error) throw error;

  return { id: newId, at: Date.now(), totalSec: Math.round(totalSec), items: payload };
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

/* ================================================================ preferences */

const PREF_DEFAULTS = { voiceURI: null, voiceName: null, rate: 1, restSec: 15 };

export async function fetchPrefs() {
  const { data, error } = await supabase
    .from("preferences")
    .select("voice_uri, voice_name, rate, rest_sec")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ...PREF_DEFAULTS };

  return {
    voiceURI: data.voice_uri,
    voiceName: data.voice_name,
    rate: Number(data.rate),
    restSec: data.rest_sec,
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

  const { error } = await supabase.from("preferences").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
