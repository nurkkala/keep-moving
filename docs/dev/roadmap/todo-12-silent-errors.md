---
label: TODO-12-silent-errors
title: "Failed loads render as empty states"
state: queued
added: 2026-09-27 11:14:57
priority: 4
---

*Added 2026-09-27 11:14:57.*

Several loads fail into an empty state:

- `History` "Clear history" rejects with no handler and shows nothing.
- `fetchPerformanceHistory` failing shows "You haven't done this one yet."
- `WorkoutPicker`'s `fetchWorkoutExercises` failing shows an empty list.
- `WorkoutEditor`'s `fetchExercises` failing shows "Nothing matches those filters."

And every load error in `WorkoutPicker` tells the user to check `VITE_SUPABASE_URL`, which
is wrong for a network or row level security failure. Show the error where the content
would have been, and name configuration only when `isConfigured` is false.
