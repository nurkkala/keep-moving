---
label: TODO-10-atomic-saves
title: "Exercise and workout saves can half-succeed"
state: queued
added: 2026-09-27 11:14:56
priority: 3
---

*Added 2026-09-27 11:14:56.*

`CLAUDE.md` routes multi-row writes through `security invoker` RPCs. Two saves do not:

- `ExerciseEditor` updates the exercise, then replaces its tags with a delete followed by an
  insert (`data.js` near line 156). A failed insert leaves the exercise with no tags. On
  create, a failed tag write leaves the exercise saved without tags, and a retry makes a
  duplicate.
- `WorkoutEditor` calls `updateWorkout` and `saveWorkoutExercises` independently, so either
  can succeed alone.

Build: one RPC per save, in a migration, following `save_workout_exercises`.
