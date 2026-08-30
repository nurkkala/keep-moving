# Coach

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

## The database

Seven migrations in `supabase/migrations/`, matching the versions already
applied to the linked project. To work against them:

```bash
supabase link --project-ref irjgefdsllshzzqxzful
supabase migration list          # local and remote should agree
```

Three of the seven are superseded — they create tables that later migrations
drop. They're kept because migration history has to replay in order, and
because rewriting it would cause drift against the deployed database.

One filename, `20260830192707_save_routine_by_exercise_ref`, uses the retired
word "routine." Leave it; renaming a migration breaks the history.

## Layout

```
src/lib/supabase.js       Client singleton
src/lib/coachData.js      Every query — the only file that talks to Supabase
src/components/           AuthGate, WorkoutPicker, ExerciseDetail
supabase/migrations/      Schema, in order
docs/SCHEMA.md            The data model and why it's shaped that way
docs/INTEGRATION.md       Porting the original prototype off window.storage
CLAUDE.md                 Conventions and open work
```

## Status

The picker, auth, detail sheet, and data layer work. The timer itself hasn't
been ported from the prototype yet — see the TODO in CLAUDE.md.
