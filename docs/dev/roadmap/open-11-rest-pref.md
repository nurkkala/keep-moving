---
label: OPEN-11-rest-pref
title: "Should preferences.rest_sec drive the rest timer?"
state: queued
added: 2026-09-27 11:14:57
priority: 4
---

*Added 2026-09-27 11:14:57.*

`preferences.rest_sec` is read by `fetchPrefs` and writable through `savePrefs`, but
nothing uses it: rest length comes from `workouts.rest_sec`, falling back to 15.
`CLAUDE.md` asks that a stored value the app does not honor be removed.

Recommendation: drop the column. Rest length belongs to a workout, where it is already set
and honored. Keep it only if a per-user default for new workouts is wanted, in which case
`WorkoutPicker`'s hard-coded 15 for a new workout should read it.

#### Ruled yes, queued 2026-09-27: drop the column

The owner chose to drop it. Build: a migration removing `preferences.rest_sec`, and the
field removed from `fetchPrefs`, `savePrefs` and the defaults in `data.js`. Rest stays a
property of each workout.
