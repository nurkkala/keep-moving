# Data model

Project: **Keep Moving** (`irjgefdsllshzzqxzful`)

## The core split

Four things, each holding what's true at its own level.

```
workouts ──< workout_exercises >── exercises >── exercise_attributes >── attribute_values >── attribute_types
   │              │  (a slot)          │                                        │
   │              └──< workout_slot_tags ───────────────────────────────────────┘
   │                                   │
   │                                   └──< exercise_targets  (one per user per exercise)
   └── days_of_week, order_mode
```

`exercises` is **definitional**: name, description, the reminders spoken aloud,
the video link, and `suggested_type` / `suggested_value` / `suggested_sets` —
the library's recommendation for someone who has never done the movement.
Everyone's Plank is the same Plank, so the exercise row is shared and the
suggestion is *nobody's target*.

`exercise_targets` is **personal**: one row per user per exercise, holding what
you're actually aiming for. `workout_exercises_resolved` falls back to the
suggestion when you've never set one, and flags which you got with
`target_is_personal`.

`workout_exercises` is a **slot** — position and an optional note, no numbers.
A slot is either a specific exercise or a rule ("two exercises tagged arms"),
never both.

`workouts` holds the grouping, the schedule, and `order_mode`.

### One target, one unit

`target_type` is `'time'`, `'reps'`, or `'distance'`, and there is a single
`target_value`: seconds, a count, or **metres**. Never a second number.

Two nullable columns plus a discriminator once allowed a contradictory row —
`type='time'` with both 45 seconds and 12 reps passed the constraint, and the
extra value sat there silently ignored. One value plus its unit makes that
state unrepresentable rather than merely forbidden.

Distance is stored in metres always; miles vs kilometres is
`preferences.distance_unit`, a display concern, so switching it can never
change what your history says you did. `actual_sec` is recorded alongside,
which is where pace comes from — there is no pace column.

Hold times, per-side counts, tempo, and breathing aren't targets at all. The
coach speaks them and never counts them, so they live in `instructions` prose.
A `hold_sec` column would be a stored value the app doesn't honour.

## Scheduling

`days_of_week` is a `smallint[]` using **JavaScript's convention** — 0 is Sunday
through 6 is Saturday — so it drops straight into `Date.getDay()` with no
translation. A GIN index makes "what's on today" a fast containment query:

```js
await fetchWorkoutsForDay();        // today, local time
await fetchWorkoutsForDay(1);       // Mondays
```

Scheduling lives on the workout rather than in a separate table because the
shape is fixed and small. An empty `days_of_week` is valid and means on-demand:
the workout can be started any time but never appears under "Today." Several
workouts may share a day; they render in `position` order.

Missed days are not tracked. There's no rollover column and no "expected
session" row to compare against, which is deliberate: a skipped Monday leaves
no trace and creates no debt. Adherence reporting would need a source of
expected sessions that doesn't exist — that's the cost of the simplicity, and
it was accepted knowingly.

`rest_sec` on a workout overrides the global preference, since a strength
circuit and a morning stretch don't want the same gap. `time_of_day`,
`starts_on`, `ends_on`, and `archived` existed once and were dropped: nothing
set or enforced them, and a stored value the app ignores is a promise it
breaks.

## Slots: exercise or rule

`workout_exercises.exercise_id` is nullable, and a check constraint enforces
the exclusive choice:

| Slot kind | `exercise_id` | `pick_count` | Tags |
| --- | --- | --- | --- |
| Fixed | set | null | — |
| Rule | null | 1–10 | `workout_slot_tags` |

A rule resolves when a session starts, so the same workout varies week to week
without editing anything. Tags are **ANDed**: two tags means an exercise must
carry both.

## Order mode

`workouts.order_mode` is `'straight'` (all sets of an exercise together) or
`'circuit'` (one set of each, in rotation). Total work is identical either way —
only the order changes — so estimates and totals are unaffected.

The timer never branches on mode. `workout_sequence(workout_id)` returns the
walked order, already expanded to one row per set and interleaved if it's a
circuit.

## Sessions: one row per set

Circuit mode broke the assumption that one exercise is one contiguous block —
its sets happen at different times, separated by other exercises. So
`session_items` is **one row per set**, not per exercise. Per-set rows also
capture decay across sets (12, 10, 8) that an averaged row destroys.

`session_items.position` is the order *performed*, which in a circuit is not
the workout's exercise order. `set_number` counts from 1 within the exercise.

Each row snapshots the target beside the result — `target_type`,
`target_value`, `target_sets` next to `actual_value` and `actual_sec` — so
raising a target later never retroactively turns a past success into a
shortfall.

**A target is state; performance is history.** `exercise_targets` is mutable
and answers "what am I aiming for today", which has exactly one answer — hence
the `one_target_per_exercise` unique constraint. The record of change comes
from `session_items`. Targets were briefly append-only; that was reverted,
because a target you set but never met is an intention, not an accomplishment.

History is a snapshot throughout: `session_items` keeps its own `name` and
`kind`, and `sessions` keeps `workout_name`, so renaming or deleting something
doesn't rewrite what your history says you did.

## Attributes

Rather than a column per axis, there are three tables:

| Table | Role | Example row |
| --- | --- | --- |
| `attribute_types` | The axes | `body_area` / "Body area" |
| `attribute_values` | Allowed values per axis | `hamstrings` / "Hamstrings" |
| `exercise_attributes` | Which values an exercise carries | Plank → Core |

Four axes ship seeded: **body area** (14 values), **condition** (13 PT
conditions), **equipment** (7), and **difficulty** (3, single-valued). Adding a
fifth — "phase of recovery", "practitioner" — is an `INSERT` into
`attribute_types`, not a migration.

This is entity-attribute-value, but with a controlled vocabulary rather than
free text. The difference matters: you can list every body area for a filter
menu, a typo can't silently create a second "hamstrings", and deleting a value
cleanly removes its tags. The cost is a join to read tags, which the
`exercise_tags` view hides.

Both `attribute_types` and `attribute_values` have a nullable `user_id`. Null
means built-in: everyone can read it, nobody can edit it. Your own additions sit
alongside. Same for `exercises` — the seeded thirteen are shared and read-only,
and `createExercise` makes ones you own.

### Why `kind` stayed a real column

`kind` (stretch / strength / core / cardio) could have been a fifth axis, but
it's load-bearing in a way the others aren't: it picks the color for every
exercise on screen and drives the all-time totals. Making it an attribute would
mean a join on every render and a rewrite of `kind_totals`. Body area and
condition are things you *filter and search* by; kind is what the app is built
around. Worth keeping the distinction.

## Equipment

Equipment is not a new concept — it's the `equipment` attribute axis. What an
exercise **needs** is a tag; what the user **owns** is a row in
`user_equipment`. A new piece of kit is an `INSERT` into `attribute_values`,
not a migration.

A `CHECK` can't run a subquery, so a trigger (`user_equipment_is_equipment`)
enforces that you can only own something on the equipment axis — without it you
could claim to own "Sciatica".

Missing equipment **warns, never hides**. `exercise_availability` gives
`needs` / `missing` / `can_do` per exercise, and `suggest_alternatives()`
offers things working the same body areas that you can actually do. Someone
might borrow a band; filtering the exercise away would just be confusing.
"No equipment" is never missing — everyone has nothing.

## Views

| View | Gives you |
| --- | --- |
| `workout_exercises_resolved` | Fixed slots with the user's target applied — what the coach reads |
| `workout_slots` | Fixed **and** rule slots in one list, with tags — what the editor reads |
| `workout_slot_rules` | A rule slot in words: "2 × Arms + Strength" |
| `workout_summaries` | Workouts with slot and exercise counts, duration estimate, missing kit |
| `exercise_tags` | Flattened `exercise_id → type / value` rows for filtering |
| `exercise_availability` | Per exercise: `needs`, `missing`, `can_do` |
| `workout_equipment` | Everything a workout's fixed slots call for, and whether you own it |
| `performance_history` | One row per set performed, with `met_target` |
| `session_exercise_totals` | One row per exercise per session — what the History screen shows |
| `exercise_bests` | Personal bests, drawn from what was done |
| `kind_totals` | All-time seconds per category |

`workout_summaries.exercise_count` counts what a workout *will* produce
(summing `pick_count`); `slot_count` counts the rows. `est_work_sec` and
`missing_equipment` cover **fixed slots only** — rule slots aren't known until
resolution, so their kit can't be promised in advance.

The duration estimate uses rough constants: ~4s a rep, ~2 m/s for distance.
It's for the picker card, not for planning. If it needs to be better, derive it
from the user's own `performance_history` rather than tuning the numbers.

## Functions

| Function | Volatility | Does |
| --- | --- | --- |
| `save_workout_exercises(workout_id, items jsonb)` | volatile | Replaces a workout's slots and their tags, in one transaction |
| `save_session(total_sec, items jsonb, workout_id, mode)` | volatile | Writes a session and its per-set items, in one transaction |
| `set_exercise_target(exercise, type, value, sets, note)` | volatile | Upserts the user's target for one exercise |
| `resolve_workout(workout_id)` | **volatile** | Slots → concrete exercises, choosing for rule slots |
| `workout_sequence(workout_id)` | **volatile** | The walked order, one row per set |
| `suggest_alternatives(exercise, want)` | stable | Substitutes working the same areas that you can do |
| `seed_default_workout()` | volatile | Creates a weekday workout from the library on first run |

All are `security invoker`, so RLS applies normally.

`resolve_workout` picks **least-recently-performed first**, with a random
tiebreak among never-done exercises, so "two arm exercises" rotates through the
library instead of returning the same favourite every week. Two calls give
different answers by design — `resolve_workout` and `workout_sequence` are
volatile on purpose. Don't mark them stable.

Multi-row writes go through the RPCs rather than several client calls so a
dropped connection can't leave half a workout behind.

## Row level security

On for every table. Owned data uses `auth.uid() = user_id`. Shared tables use
`user_id is null or auth.uid() = user_id` for reads and `auth.uid() = user_id`
for writes. `exercise_attributes` and `workout_slot_tags` have no `user_id` of
their own — their policies check ownership through the parent row, so you can
read tags on built-ins but only write tags on your own.

Because the policies do the filtering, queries don't repeat it. If you find
yourself adding `.eq("user_id", ...)` to a read, the policy is probably what
needs fixing instead.

## What the app calls

`src/lib/data.js` is the only file that talks to Supabase — around forty
functions, all returning camelCase shapes rather than raw rows.

```js
import {
  // catalog
  fetchExercises, fetchExercise, createExercise, updateExercise,
  deleteExercise, setExerciseTags, fetchAttributeTypes, createAttributeValue,
  // workouts and slots
  fetchWorkouts, fetchWorkoutsForDay, fetchOrSeedWorkouts,
  createWorkout, updateWorkout, deleteWorkout,
  fetchWorkoutExercises, fetchWorkoutSlots, saveWorkoutExercises,
  fetchWorkoutSequence, previewWorkout, describeRule, describeDays,
  // targets
  fetchTargets, setExerciseTarget, clearExerciseTarget,
  // sessions and history
  saveSession, fetchHistory, fetchPerformanceHistory, fetchBests,
  deleteSession, clearHistory, fetchKindTotals,
  // equipment
  fetchEquipment, setEquipmentOwned, fetchAvailability,
  fetchWorkoutEquipment, fetchAlternatives,
  // preferences and formatting
  fetchPrefs, savePrefs, describeTarget, describePace,
  formatDistance, toMetres, fromMetres,
} from "./lib/data";

// Everything tagged for a condition, across all body areas
const forSciatica = await fetchExercises({ valueKeys: ["sciatica"] });

// The sequence the timer walks — one entry per set, already in performed order
const steps = await fetchWorkoutSequence(workoutId);
```

`fetchWorkoutSequence(id)` is what the coach iterates: `name`, `kind`,
`targetType`, `targetValue`, `setNumber`, `totalSets`, `cue`, and `fromRule`.
Because rule slots resolve inside it, calling it twice gives two different
workouts — call it once, at session start.

`cue` resolves in order: the slot's own `note` if it has one, otherwise the
exercise's `instructions`. That way "go easy on the left knee today" can live
on one workout without editing the shared exercise.
