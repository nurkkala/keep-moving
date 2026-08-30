# Wiring the coach to Supabase

Project: **Coach Claude** (`irjgefdsllshzzqxzful`, us-east-2)

## 1. Install and configure

```bash
npm install @supabase/supabase-js
```

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://irjgefdsllshzzqxzful.supabase.co
VITE_SUPABASE_ANON_KEY=<paste from the dashboard>
```

The anon key is at **Project Settings → API Keys** in your Supabase dashboard.
It's meant to be public — row level security is what protects the data, not
the key. Never put the `service_role` key in a Vite env var; anything prefixed
`VITE_` gets compiled into the bundle your users download.

Add `.env.local` to `.gitignore`, and restart the dev server after creating it.

## 2. Turn on email auth

Dashboard → **Authentication → Providers → Email**. For a personal app you can
switch off "Confirm email" so sign-up logs you straight in.

## 3. Wrap the app

```jsx
// src/App.jsx
import AuthGate from "./components/AuthGate";
import ExerciseCoach from "./ExerciseCoach";

export default function App() {
  return <AuthGate>{({ user, signOut }) => <ExerciseCoach onSignOut={signOut} />}</AuthGate>;
}
```

## 4. Replace the storage calls

Every `window.storage` call in `exercise-coach.jsx` maps to one function. The
`HISTORY_KEY` and `VOICE_KEY` constants can go.

```js
import {
  fetchOrSeedWorkouts, fetchWorkoutExercises, saveWorkoutExercises,
  fetchHistory, saveSession, clearHistory,
  fetchPrefs, savePrefs,
} from "./lib/coachData";
```

| Current | Replace with |
| --- | --- |
| `window.storage.get(HISTORY_KEY)` on mount | `await fetchHistory()` |
| `window.storage.set(HISTORY_KEY, …)` in `finish()` | `await saveSession({ totalSec, items, workoutId })` |
| `window.storage.delete(HISTORY_KEY)` in `clear()` | `await clearHistory()` |
| `window.storage.get(VOICE_KEY)` | `await fetchPrefs()` |
| `window.storage.set(VOICE_KEY, …)` | `await savePrefs({ voiceURI, voiceName, rate })` |
| `DEFAULT_ROUTINE` constant | Delete it — the starter exercises live in the database now |
| routine held only in state | `await fetchOrSeedWorkouts()`, then `fetchWorkoutExercises(id)` |
| routine editor saves | `saveWorkoutExercises(workoutId, list)` |
| rest slider held only in state | `savePrefs({ restSec })`, or `updateWorkout(id, { restSec })` to set it per workout |

Two things worth handling while you're in there:

- **The exercise list editor should debounce.** Dragging the rest slider or typing a
  name shouldn't fire a write per keystroke. Save ~600ms after the last change.
- **`finish()` currently updates state optimistically.** Keep that — write to
  Supabase in the background and only surface an error if it fails, so a slow
  network doesn't stall the end-of-session announcement.

## What's in the database

| Table | Holds |
| --- | --- |
| `exercises` | The library: name, description, instructions, video, defaults |
| `attribute_types` / `attribute_values` | The tag vocabulary — body area, condition, equipment, difficulty |
| `exercise_attributes` | Which tags each exercise carries |
| `workouts` | Named groups with a schedule: days, time, start and end dates |
| `workout_exercises` | The ordered list inside one workout, with optional overrides |
| `sessions` | One row per finished session, with `total_sec` and the workout it came from |
| `session_items` | Per-exercise results: actual seconds, skipped, how it ended |
| `preferences` | Chosen voice, speech rate, default rest interval |

See SCHEMA.md for the full model and the reasoning behind it.

RLS is on for every table. Owned data uses `auth.uid() = user_id`; shared data
(the starter exercises and the tag vocabulary) is readable by everyone and
writable by no one. `save_workout_exercises()`, `save_session()`, and
`seed_default_workout()` are `security invoker` RPCs that do their multi-row
writes in one transaction, so a dropped connection can't leave you with half a
workout.

## A note on vocabulary

**Workout** is the word, everywhere — table, function, and variable names.
"Routine" is retired to avoid two near-synonyms meaning different things. If a
grouping level above workouts is ever needed — a fixed-length rehab protocol
containing several workouts — that's a **program**.
