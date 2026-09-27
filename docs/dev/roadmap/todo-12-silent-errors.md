---
label: TODO-12-silent-errors
title: "Failed loads render as empty states"
state: done
added: 2026-09-27 11:14:57
closed: 2026-09-27 12:20:58
priority: 4
---

*Added 2026-09-27 11:14:57 · done 2026-09-27 12:20:58.*

Several loads failed into an empty state:

- `History` "Clear history" rejects with no handler and shows nothing.
- `fetchPerformanceHistory` failing shows "You haven't done this one yet."
- `WorkoutPicker`'s `fetchWorkoutExercises` failing shows an empty list.
- `WorkoutEditor`'s `fetchExercises` failing shows "Nothing matches those filters."

And every load error in `WorkoutPicker` told the user to check `VITE_SUPABASE_URL`, which
is wrong for a network or row level security failure. Show the error where the content
would have been, and name configuration only when `isConfigured` is false.

#### Built 2026-09-27

Each of the four now shows its error where the content would have been. The picker's hint now says to check the connection: `App` renders its setup page when credentials are missing, so the picker never runs without them, and `isConfigured` did not need consulting.
