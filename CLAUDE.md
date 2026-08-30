# Coach

A voice-coached exercise timer. It announces each exercise, counts down, listens
for "done" or "skip", and logs what you actually did.

Vite + React 19 + Tailwind 4, with Supabase for auth and storage.

## Vocabulary

Use these words consistently — in table names, function names, and UI copy.

- **Exercise** — a movement that exists on its own: name, description,
  instructions, video, and default reps or duration. Lives in `exercises`.
- **Workout** — a named, scheduled group of exercises. Lives in `workouts`.
- **Session** — one performance of a workout, with what actually happened.
- **Program** — reserved, not yet built. If a level above workouts is ever
  needed (a six-week protocol containing several workouts), it's a program.

**Do not use "routine."** It was the old name for a workout and was retired
because two near-synonyms meaning different things caused real confusion. One
migration filename still contains it (`20260830192707_save_routine_by_exercise_ref`)
because renaming it would break migration history — leave it alone.

## Scheduling: decided

Fixed weekdays, attached to workouts, no makeup. This was chosen deliberately
over frequency targets, every-N-days intervals, and rotating cycles.

- `workouts.days_of_week` is the whole model. Exercises are never scheduled;
  only workouts are.
- **A missed day is simply gone.** There is no rollover, no makeup queue, no
  "overdue" state, and no missed-day record in history. If today's workout
  isn't done, tomorrow shows tomorrow's workout and nothing else.
- Do not add streak counters, adherence percentages, or catch-up prompts. The
  point of no-makeup is that missing a day costs nothing and creates no debt.
- An empty `days_of_week` is valid and means on-demand: the workout exists and
  can be started any time, but never appears under "Today."
- Several workouts may share a day. They render in `position` order.
- There is no time of day, no start or end date, and no archive flag. A
  workout belongs to a day and nothing else. These columns existed once and
  were dropped because nothing set or enforced them: a stored value the app
  doesn't honour is a promise it breaks. Don't add one back without building
  the behaviour it implies at the same time.

If frequency targets ("3× a week") are ever wanted, that's a `target_per_week`
column plus a weekly count against `sessions` — additive, not a rewrite. Doing
it would reopen the makeup question, so treat it as a product decision rather
than a refactor.

## Architecture

`src/lib/coachData.js` is the only file that talks to Supabase. Components call
its functions and never touch `supabase.from(...)` directly. Keeping that line
clean is what makes the schema safe to change.

Row level security does the access control, so queries don't filter on
`user_id` by hand. If you find yourself adding `.eq("user_id", ...)` to a read,
the policy is probably what needs fixing instead.

Multi-row writes go through the `security invoker` RPCs (`save_workout_exercises`,
`save_session`) so a dropped connection can't leave half a workout behind.

See `docs/SCHEMA.md` for the data model and the reasoning behind it.

## Conventions

- **One target, one unit.** `target_type` is 'time' or 'reps' and there is a
  single `target_value`. Never a second number.
- **Exercises are shared; targets are personal.** `exercises` is definitional —
  everyone's Plank is the same Plank. What it carries is `suggested_*`, the
  library's recommendation for a newcomer, which is *nobody's target*. The
  user's actual target lives in `exercise_targets`, one row per user per
  exercise, and `workout_exercises_resolved` falls back to the suggestion when
  no target is set. Don't reintroduce a target column on `exercises`.
- **A target is state; performance is history.** `exercise_targets` is
  mutable and answers "what am I aiming for today". The record of change comes
  from `session_items`, which snapshots the target beside the result every time
  an exercise is performed. Don't make targets append-only again — a target set
  and never met is an intention, not an accomplishment.
- **Session items are one row per SET, not per exercise.** Circuit mode
  separates an exercise's sets in time, and per-set rows also capture decay
  (12, 10, 8) that an averaged row destroys. `session_items.position` is order
  *performed*, which in a circuit is not the workout's exercise order.
- **Prescription detail the app doesn't measure goes in `instructions` prose,
  not columns.** Hold times, per-side counts, tempo, breathing — the coach
  speaks them aloud and never counts them. "Squeeze at the top for a count" is
  the pattern. Don't add a `hold_sec` column; it would be a stored value the
  app doesn't honour.
- `workout_exercises` holds position and an optional note. No numbers. If you
  find yourself adding a target column there, the target belongs on the user's
  `exercise_targets` row instead.
- `order_mode` on a workout is 'straight' or 'circuit'. Call
  `workout_sequence(workout_id)` for the walked order — it expands sets and
  interleaves them, so the timer never branches on mode. Total work is
  identical either way.
- History is a snapshot. `session_items` keeps its own `name` and `kind`, and
  `sessions` keeps `workout_name`, so renaming something doesn't rewrite what
  your history says you did. Don't "fix" this by joining to live rows.
- `days_of_week` is JavaScript's convention: 0 = Sunday, 6 = Saturday.
- Dark UI, `rounded-sm`, uppercase `tracking-[0.25em]` eyebrow labels,
  `fontVariantNumeric: tabular-nums` on anything that counts.
- Voice recognition is Chrome and Edge only. The coach must ignore audio while
  it is speaking, or it hears itself say "done."

## Building

`npm run build` runs `vite build` then `scripts/verify-build.mjs`, which asserts
each screen actually made it into the bundle.

That check exists because a Vite build **succeeds while producing a bundle with
almost no application code**. `import.meta.env` is replaced at build time, so a
module-scope `throw` on a missing env var becomes unconditional and Rollup
prunes every module downstream as unreachable — no warning, exit code 0, a
deployable bundle containing React and an error string. It happened here once.

Two rules follow:
- **Keep `src/lib/supabase.js` free of side effects at import time.** Export
  `isConfigured` and let a component render the problem.
- **Build with env vars present.** Without them the app correctly compiles down
  to just the setup screen, and `verify-build` will tell you so.

The check also catches a component that exists but nothing imports — that's how
`ExerciseEditor` was found unwired.

## Database changes

Schema changes are migrations, never dashboard edits:

```bash
supabase migration new some_change   # writes supabase/migrations/<ts>_some_change.sql
supabase db push                     # applies to the linked project
supabase migration list              # local and remote must agree
```

Never hand-name a migration file to match one applied out of band — the
filename timestamp *is* the version, and inventing one causes drift that only
surfaces later as a failed push.

Run `supabase db lint` and check the dashboard's Security Advisor after any
change that adds a table — a table without RLS enabled is readable by anyone
holding the anon key, which is public.

## TODO

1. **Port the timer.** `exercise-coach.jsx` from the original prototype still
   uses `window.storage` and one flat list. It should walk
   `fetchWorkoutSequence(workoutId)` — already one entry per set, in performed
   order — and call `saveSession({ items, workoutId, orderMode })` with one
   item per set. Its `DEFAULT_ROUTINE` constant should be deleted; those
   exercises live in the database now.
5. **Target editor.** `setExerciseTarget` / `clearExerciseTarget` exist and
   nothing calls them. Until something does, every user stays on the library's
   suggestions — `targetIsPersonal` is false everywhere.
2. **Exercise editor.** Create and edit your own exercises with a video URL
   and tags. `ExerciseDetail` already takes an unwired `onEdit` prop.
3. **Workout editor.** Reorder, add and remove exercises, set per-slot
   overrides, edit the schedule.
4. **History against workouts.** Sessions now carry `workout_id`; the history
   view still shows a flat list.
