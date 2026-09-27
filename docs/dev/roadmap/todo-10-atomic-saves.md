---
label: TODO-10-atomic-saves
title: "Exercise and workout saves can half-succeed"
state: done
added: 2026-09-27 11:14:56
closed: 2026-09-27 12:27:21
priority: 3
---

*Added 2026-09-27 11:14:56 · done 2026-09-27 12:27:21.*

`CLAUDE.md` routes multi-row writes through `security invoker` RPCs. Two saves did not:

- `ExerciseEditor` updates the exercise, then replaces its tags with a delete followed by an
  insert (`data.js` near line 156). A failed insert leaves the exercise with no tags. On
  create, a failed tag write leaves the exercise saved without tags, and a retry makes a
  duplicate.
- `WorkoutEditor` calls `updateWorkout` and `saveWorkoutExercises` independently, so either
  can succeed alone.

Build: one RPC per save, in a migration, following `save_workout_exercises`.

#### Built 2026-09-27

Migration `20260927161936_save_exercise_and_workout_atomically` adds `save_exercise(id, fields, tag_ids)`, which creates or updates and replaces tags, and `save_workout(id, fields, items)`, which updates the workout and calls `save_workout_exercises`. `data.js` exposes them as `saveExercise` and `saveWorkout`; `createExercise`, `updateExercise`, `setExerciseTags`, `updateWorkout` and `saveWorkoutExercises` are gone. Dry-run on the live project in a rolled-back transaction as the owner: slots kept (13 to 13), tags created then cleared, a built-in exercise rejected. Applied the same day; `make db-check` reported 30 migrations agreeing.
