# Data model

Project: **Coach Claude** (`irjgefdsllshzzqxzful`)

## The core split

Three levels, each holding what's true at that level.

```
workouts ──< workout_exercises >── exercises
   │                                   │
   │                                   └──< exercise_attributes >── attribute_values >── attribute_types
   └── days_of_week, time_of_day, starts_on, ends_on
```

`exercises` holds what's true about the movement everywhere: name, description,
the reminders you say out loud, the video link, and default reps or duration.

`workout_exercises` holds what's true about it *in this workout*: its position,
optional sets, and a longer or shorter target if you want one. Leave the
overrides null and the slot tracks the exercise's defaults — change Plank from
45s to 60s once and every workout that hasn't overridden it follows.

`workouts` holds the grouping and the schedule: a name, which days it runs, an
optional time, and optional start and end dates for a fixed-length PT protocol.

## Scheduling

`days_of_week` is a `smallint[]` using **JavaScript's convention** — 0 is Sunday
through 6 is Saturday — so it drops straight into `Date.getDay()` with no
translation. A GIN index makes "what's on today" a fast containment query:

```js
await fetchWorkoutsForDay();        // today, local time
await fetchWorkoutsForDay(1);       // Mondays
```

Scheduling lives on the workout rather than in a separate table because the
shape is fixed and small. If recurrence ever gets richer than "these weekdays" —
alternating weeks, every third day — that's the point to move it out.

Missed days are not tracked. There's no rollover column and no "expected
session" row to compare against, which is deliberate: a skipped Monday leaves
no trace and creates no debt. Adherence reporting would need a source of
expected sessions that doesn't currently exist — that's the cost of the
simplicity, and it was accepted knowingly.

`starts_on` / `ends_on` are for programs with a defined run: a six-week
post-op protocol expires on its own rather than sitting in the list forever.
`rest_sec` on a workout overrides the global preference, since a strength
circuit and a morning stretch don't want the same gap.

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
alongside. Same for `exercises` — the seeded ten are shared and read-only, and
`createExercise` makes ones you own.

### Why `kind` stayed a real column

`kind` (stretch / strength / core / cardio) could have been a fifth axis, but
it's load-bearing in a way the others aren't: it picks the color for every
exercise on screen and drives the all-time totals. Making it an attribute would
mean a join on every render and a rewrite of `kind_totals`. Body area and
condition are things you *filter and search* by; kind is what the app is built
around. Worth keeping the distinction.

## Views

| View | Gives you |
| --- | --- |
| `workout_exercises_resolved` | One workout's list with overrides applied — what the coach reads |
| `workout_summaries` | Workouts with exercise counts and an estimated duration |
| `exercise_tags` | Flattened `exercise_id → type / value` rows for filtering |
| `kind_totals` | All-time seconds per category |

## Functions

`save_workout_exercises(workout_id, items jsonb)` and
`save_session(total_sec, items jsonb, workout_id)` do their multi-row writes in
one transaction. `seed_default_workout()` creates a weekday workout from the
built-in library on first run. All three are `security invoker`, so RLS applies
normally.

Sessions store `workout_name` alongside `workout_id` — a snapshot, so renaming
or deleting a workout doesn't rewrite what your history says you did.

## Row level security

On for every table. Owned data uses `auth.uid() = user_id`. Shared tables use
`user_id is null or auth.uid() = user_id` for reads and `auth.uid() = user_id`
for writes. `exercise_attributes` has no `user_id` of its own — its policies
check ownership through the parent exercise, so you can read tags on built-ins
but only write tags on your own.

## What the app calls

```js
import {
  fetchExercises, fetchExercise, createExercise, updateExercise,
  deleteExercise, setExerciseTags,
  fetchAttributeTypes, createAttributeValue,
  fetchWorkouts, fetchWorkoutsForDay, fetchOrSeedWorkouts,
  createWorkout, updateWorkout, deleteWorkout,
  fetchWorkoutExercises, saveWorkoutExercises, describeDays,
  fetchHistory, saveSession, deleteSession, clearHistory, fetchKindTotals,
  fetchPrefs, savePrefs,
} from "./lib/coachData";

// Everything tagged for a condition, across all body areas
const forSciatica = await fetchExercises({ valueKeys: ["sciatica"] });

// Vocabulary for filter menus and the exercise editor
const axes = await fetchAttributeTypes();
```

`fetchWorkoutExercises(id)` returns the shape the coach already speaks — `name`,
`kind`, `type`, `seconds` or `reps`, and `cue` — so the timer loop needs no
changes. `videoUrl`, `description`, and `exerciseId` come along for the detail
sheet.

`cue` resolves in order: the slot's own `note` if it has one, otherwise the
exercise's `instructions`. That way "go easy on the left knee today" can live on
one workout without editing the shared exercise.
