# Keep Moving

A voice-coached exercise timer. It announces each exercise, counts down, listens
for "done" or "skip", and logs what you actually did — backed by Supabase so
your workouts and history follow you across devices.

## Running it

```bash
npm install
cp .env.example .env.local     # then paste your anon key
npm run dev
```

The anon key is at **Project Settings → API Keys** in the Supabase dashboard.
It's public by design — row level security protects the data, not the key.
Never put the `service_role` key in a `VITE_` variable; anything so prefixed is
compiled into the bundle the browser downloads.

Email auth needs turning on once, at **Authentication → Providers → Email**.
For a personal app, switch off "Confirm email" so sign-up logs you straight in.

Voice recognition is Chrome and Edge only. Everything else — the timer, the
spoken announcements, the logging — works anywhere.

## The database

Twenty-five migrations in `supabase/migrations/`, matching the versions already
applied to the linked project. To work against them:

```bash
supabase link --project-ref irjgefdsllshzzqxzful
supabase migration list          # local and remote should agree
```

Several early migrations create things that later ones drop — `routine_exercises`
and `save_routine` are gone, replaced by `workouts` and `workout_exercises`, and
targets have moved off `exercises` onto a per-user `exercise_targets` table.
They're kept because migration history has to replay in order, and because
rewriting it would cause drift against the deployed database.

One filename, `20260830192707_save_routine_by_exercise_ref`, uses the retired
word "routine." Leave it; renaming a migration breaks the history.

## Layout

```
src/lib/supabase.js       Client singleton — no side effects at import time
src/lib/data.js           Every query — the only file that talks to Supabase
src/lib/speech.js         Speaking and listening
src/components/           AuthGate, WorkoutPicker, SessionScreen, WorkoutEditor,
                          ExerciseDetail, ExerciseEditor, TargetSheet,
                          EquipmentInventory, History
supabase/migrations/      Schema, in order
scripts/                  Build verification
docs/SCHEMA.md            The data model and why it's shaped that way
docs/INTEGRATION.md       Porting the original prototype off window.storage
CLAUDE.md                 Conventions and open work
```

## Building

```bash
npm run build
```

That runs `vite build` and then `scripts/verify-build.mjs`, which asserts each
screen actually made it into the bundle — a Vite build can succeed while
producing a bundle with almost no application code, so the check is not
optional. **Build with your env vars present**: without them the app correctly
compiles down to just the setup screen, and `verify-build` will say so.

## Status

All nine screens are built and wired: auth, the picker, the timer, the workout
editor, the exercise editor, the target sheet, the detail sheet, equipment, and
history. The timer walks `fetchWorkoutSequence` — one entry per set, in performed
order — and saves one `session_items` row per set.

Dark, light, and follow-the-system, chosen from the header on Today. The layout
is one column at every width, widening at `lg` rather than rearranging.

Nothing is queued. See the TODO at the end of CLAUDE.md.
