# Keep Moving

A voice-coached exercise timer. It announces each exercise, counts down, listens
for "done" or "skip", and logs what you actually did — backed by Supabase so
your workouts and history follow you across devices.

## Running it

```bash
cp .env.example .env.local     # then paste your anon key
make dev                       # http://localhost:5173, hot reload
```

`make dev` installs dependencies if they're stale and stops with a readable
message if `.env.local` is missing, so it's the only command needed from a
fresh clone. `make help` lists all 15 targets. Override the port with
`make dev PORT=3000`.

| | |
| --- | --- |
| `make dev` | Dev server with hot reload — the everyday loop |
| `make run` | Build for production, then serve that build |
| `make build` | Production build + verify every screen shipped |
| `make preview` | Serve an existing build without rebuilding |
| `make check` | What CI would run |
| `make clean` | Drop build output and Vite's cache |

There is no separate backend to run. The app is a Vite SPA against hosted
Supabase, with no edge functions, so `dev` is one process rather than two.

The anon key is at **Project Settings → API Keys** in the Supabase dashboard.
It's public by design — row level security protects the data, not the key.
Never put the `service_role` key in a `VITE_` variable; anything so prefixed is
compiled into the bundle the browser downloads.

Email auth needs turning on once, at **Authentication → Providers → Email**.
For a personal app, switch off "Confirm email" so sign-up logs you straight in.

Voice recognition is Chrome and Edge only. Everything else — the timer, the
spoken announcements, the logging — works anywhere.

## The database

Twenty-six migrations in `supabase/migrations/`, matching the versions already
applied to the linked project. To work against them:

```bash
supabase link --project-ref irjgefdsllshzzqxzful   # once
make db-status                                     # local and remote should agree
```

| | |
| --- | --- |
| `make db-status` | Compare local migrations against the linked project |
| `make db-new NAME=add_something` | Scaffold a migration |
| `make db-push` | Apply pending migrations to the linked project |
| `make db-lint` | Lint the schema — run after anything that adds a table |
| `make db-types` | Regenerate TypeScript types from the linked schema |

These act on the **live hosted project**, so none of them is wired into a watch
loop. Re-applying migrations on every save would run schema changes against the
real database, and migrations don't roll back — `make db-push` stays manual on
purpose.

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
                          ExerciseLibrary, ExerciseDetail, ExerciseEditor,
                          TargetSheet, EquipmentInventory, History
                          KindBadge, EquipmentNote, ThemeToggle — shared bits
src/lib/theme.js          Dark / light / system, and where each is stored
supabase/migrations/      Schema, in order
scripts/                  Build verification
Makefile                  Every task worth running; `make help` lists them
docs/SCHEMA.md            The data model and why it's shaped that way
docs/INTEGRATION.md       How the original prototype came off window.storage
CLAUDE.md                 Conventions and open work
```

## Building

```bash
make build
```

That runs `vite build` and then `scripts/verify-build.mjs`, which asserts each
screen actually made it into the bundle — a Vite build can succeed while
producing a bundle with almost no application code, so the check is not
optional. **Build with your env vars present**: without them the app correctly
compiles down to just the setup screen, and `verify-build` will say so. The
`make` target guards this, refusing to build without `.env.local`.

The npm scripts still exist and `make` calls them, so `npm run build` works
identically — it just skips the guards.

## Status

All ten screens are built and wired: auth, the picker, the timer, the workout
editor, the exercise library, the exercise editor, the target sheet, the detail
sheet, equipment, and history. The timer walks `fetchWorkoutSequence` — one
entry per set, in performed order — and saves one `session_items` row per set.

Dark, light, and follow-the-system, chosen from the header on Today. The layout
is one column at every width, widening at `lg` rather than rearranging.

Equipment is stated wherever an exercise is listed, not hidden behind a tap: the
Today card names what you're short of, workout rows carry it, and the library
filters on it.

Open work is at the end of CLAUDE.md.
