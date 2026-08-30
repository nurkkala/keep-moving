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

- Overrides are null-means-inherit. A workout slot with `seconds = null` tracks
  the exercise's default. Preserve that — don't write the resolved value back.
- History is a snapshot. `session_items` keeps its own `name` and `kind`, and
  `sessions` keeps `workout_name`, so renaming something doesn't rewrite what
  your history says you did. Don't "fix" this by joining to live rows.
- `days_of_week` is JavaScript's convention: 0 = Sunday, 6 = Saturday.
- Dark UI, `rounded-sm`, uppercase `tracking-[0.25em]` eyebrow labels,
  `fontVariantNumeric: tabular-nums` on anything that counts.
- Voice recognition is Chrome and Edge only. The coach must ignore audio while
  it is speaking, or it hears itself say "done."

## Database changes

Schema changes are migrations, never dashboard edits:

```bash
supabase migration new some_change   # writes supabase/migrations/<ts>_some_change.sql
supabase db push                     # applies to the linked project
```

Run `supabase db lint` and check the dashboard's Security Advisor after any
change that adds a table — a table without RLS enabled is readable by anyone
holding the anon key, which is public.

## TODO

1. **Port the timer.** `exercise-coach.jsx` from the original prototype still
   uses `window.storage` and one flat list. It needs `fetchWorkoutExercises`,
   `savePrefs`, and `saveSession({ workoutId })`, and its `DEFAULT_ROUTINE`
   constant should be deleted — those exercises live in the database now.
2. **Exercise editor.** Create and edit your own exercises with a video URL
   and tags. `ExerciseDetail` already takes an unwired `onEdit` prop.
3. **Workout editor.** Reorder, add and remove exercises, set per-slot
   overrides, edit the schedule.
4. **History against workouts.** Sessions now carry `workout_id`; the history
   view still shows a flat list.
