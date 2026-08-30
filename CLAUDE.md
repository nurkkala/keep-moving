# Keep Moving

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

`src/lib/data.js` is the only file that talks to Supabase. Components call
its functions and never touch `supabase.from(...)` directly. Keeping that line
clean is what makes the schema safe to change.

Row level security does the access control, so queries don't filter on
`user_id` by hand. If you find yourself adding `.eq("user_id", ...)` to a read,
the policy is probably what needs fixing instead.

Multi-row writes go through the `security invoker` RPCs (`save_workout_exercises`,
`save_session`) so a dropped connection can't leave half a workout behind.

See `docs/SCHEMA.md` for the data model and the reasoning behind it.

## Conventions

- **One target, one unit.** `target_type` is 'time', 'reps', or 'distance',
  and there is a single `target_value` — seconds, a count, or **metres**.
  Never a second number.
- **Distance is stored in metres, always.** Miles vs kilometres is
  `preferences.distance_unit`, a display concern only, so switching it can
  never change what history says you did. `actual_sec` is recorded alongside,
  which is where pace comes from — don't add a pace column.
- **Equipment is not a new concept.** It's the `equipment` attribute axis.
  What an exercise NEEDS is a tag; what the user OWNS is `user_equipment`. A
  new piece of kit is an INSERT into `attribute_values`, not a migration. A
  trigger enforces that you can only own something on the equipment axis.
- Missing equipment **warns, never hides**. `exercise_availability` gives
  `needs` / `missing` / `can_do`, and `suggest_alternatives()` offers things
  working the same area that the user can actually do. Someone might borrow a
  band; filtering the exercise away would just be confusing.
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
- **A slot is an exercise OR a rule, never both**, enforced by a check
  constraint. A rule slot has `pick_count` and tags in `workout_slot_tags`, and
  resolves at session start via `resolve_workout()` — least-recently-performed
  first, so "two arm exercises" rotates and favours what's been neglected.
  `resolve_workout` and `workout_sequence` are **volatile**: two calls give
  different answers by design. Don't mark them stable.
- Rule tags are ANDed. Two tags means an exercise must carry both.
- `workout_summaries.exercise_count` counts what a workout *will* produce
  (summing `pick_count`); `slot_count` counts the rows. `est_work_sec` and
  `missing_equipment` cover fixed slots only — rule slots aren't known until
  resolution, so their kit can't be promised in advance.
- The duration estimate uses rough constants: ~4s a rep, ~2 m/s for distance.
  It's for the picker card, not for planning. If it needs to be better, derive
  it from the user's own `performance_history` rather than tuning the numbers.
- History is a snapshot. `session_items` keeps its own `name` and `kind`, and
  `sessions` keeps `workout_name`, so renaming something doesn't rewrite what
  your history says you did. Don't "fix" this by joining to live rows.
- `days_of_week` is JavaScript's convention: 0 = Sunday, 6 = Saturday.
- **No raw palette colours in components.** Every colour goes through a
  semantic token defined in `src/index.css` — `bg-canvas`, `text-subtle`,
  `border-line`, `ring-accent`. A `bg-slate-900` in a component only renders
  correctly in one theme, which is the bug the tokens exist to prevent.
- **`kind` colour is not severity.** The four exercise kinds have their own
  scale (`kind-stretch`, `kind-strength`, `kind-core`, `kind-cardio`). Cardio
  is rose and errors are rose, but they're different tokens on purpose — don't
  reuse `danger` for cardio just because they match today.
- **The four kinds are defined once, in `components/KindBadge.jsx`.** That map
  was previously copied into four components with drifting shapes. Import
  `KINDS` from there; don't redeclare it. Kind is shown as a `KindBadge` —
  colour plus a glyph plus a `title`, because a coloured dot alone says nothing
  to someone who doesn't know the code and nothing at all to someone who can't
  separate the hues.
- **Never `window.confirm`, `window.prompt`, or `window.alert`.** They can't be
  themed, ignore the dark/light choice entirely, and render as a desktop alert
  on a screen sized for a thumb. Use `ConfirmDialog` / `PromptDialog` from
  `components/Dialog.jsx`, which match the sheets and handle Escape and focus.
- **Say what an exercise needs where it's listed, not behind a tap.**
  `EquipmentNote` renders `fetchAvailability()` output inline, and stays silent
  for bodyweight exercises so the rows that do need something stand out. One
  `fetchAvailability()` covers the whole library — don't query per row.
- **Theme lives in two places, deliberately.** `localStorage` drives first
  paint via the inline script in `index.html`; `preferences.theme` is the
  cross-device copy that `syncThemeFromPrefs` adopts once a session exists. If
  you change the storage key or the resolution rule, change both — the inline
  script can't import from `src/lib/theme.js`.
- **One column at every width.** The layout widens at `lg` (`max-w-lg
  lg:max-w-2xl`) rather than rearranging into a grid. The controls are sized
  for a thumb because the app is used propped on a floor, and a desktop layout
  that shrinks them would be worse on the device it's actually used on.
- `rounded-sm`, uppercase `tracking-[0.25em]` eyebrow labels,
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
surfaces later as a failed push. `make migrations` now refuses a hand-named
file rather than letting it reach a push.

**The migrations are in git; applying them is not.** That gap drifts both
ways, and both directions are checked: `make migrations` (offline — well-named,
unique, committed) and `make db-check` (asks the linked project — committed but
unapplied, or applied but uncommitted). Run `make db-check` after any `db push`,
and before trusting that a fresh clone can rebuild the schema.

Nothing applies migrations automatically, and that's deliberate: they're
forward-only, and with one production project, auto-applying on merge makes the
gap between "merged" and "irreversible" zero. CI will run the drift check if
`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `SUPABASE_PROJECT_ID` are
set, and skips with a notice otherwise.

Run `supabase db lint` and check the dashboard's Security Advisor after any
change that adds a table — a table without RLS enabled is readable by anyone
holding the anon key, which is public.

## TODO

The five items that stood here — port the timer, target editor, exercise
editor, workout editor, and history against workouts — are all done, and the
list was left describing work that had already shipped. Verified against the
code: `SessionScreen` walks `fetchWorkoutSequence` and calls `saveSession`
with no `window.storage` left; `TargetSheet` calls `setExerciseTarget` and
`clearExerciseTarget`; `ExerciseEditor` is reached from both `WorkoutPicker`
and `WorkoutEditor`; `WorkoutEditor` is reached from `App`; and `History`
groups by session and shows `workoutName`.

Nothing is queued. **Program** remains reserved and unbuilt — see Vocabulary.

`docs/INTEGRATION.md` is now a historical record of that port rather than a
plan. It still names `exercise-coach.jsx` and `ExerciseCoach`, which are the
prototype's real filenames; don't rename those to match current components,
because the whole point of the document is what the old code was called.
