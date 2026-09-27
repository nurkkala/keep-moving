---
label: OPEN-11-rest-pref
title: "Should preferences.rest_sec drive the rest timer?"
state: done
added: 2026-09-27 11:14:57
closed: 2026-09-27 12:15:46
priority: 4
---

*Added 2026-09-27 11:14:57 · done 2026-09-27 12:15:46.*

`preferences.rest_sec` was read by `fetchPrefs` and writable through `savePrefs`, but
nothing used it: rest length came from `workouts.rest_sec`, falling back to 15.
`CLAUDE.md` asks that a stored value the app does not honor be removed.

Recommendation: drop the column. Rest length belongs to a workout, where it is already set
and honored. Keep it only if a per-user default for new workouts is wanted, in which case
`WorkoutPicker`'s hard-coded 15 for a new workout should read it.

#### Ruled yes, queued 2026-09-27: drop the column

The owner chose to drop it. Build: a migration removing `preferences.rest_sec`, and the
field removed from `fetchPrefs`, `savePrefs` and the defaults in `data.js`. Rest stays a
property of each workout.

Built the same day: `data.js` stopped selecting and writing the column, and migration
`20260927161218_drop_preferences_rest_sec` dropped it and commented `workouts.rest_sec`
with the real fallback. Applied to the linked project; `make db-check` reported 28
migrations agreeing.
