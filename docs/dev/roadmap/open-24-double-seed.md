---
label: OPEN-24-double-seed
title: "The default workout may seed twice in development"
state: open
added: 2026-09-27 11:14:59
priority: 6
---

*Added 2026-09-27 11:14:59.*

Under React StrictMode in development, effects run twice, so `fetchOrSeedWorkouts` may run
twice concurrently. If `seed_default_workout` checks for existing workouts without a lock
or a unique constraint, both calls can seed. Unverified: reproduce against a fresh user
before changing anything. A unique constraint or an advisory lock in the function would
close it; production is unaffected, since StrictMode's double run is development-only.

#### To measure, 2026-09-27

The owner asked for the measurement before any ruling: read `seed_default_workout`, run
two concurrent calls for a user with no workouts inside a rolled-back transaction, and fix
with a lock or a constraint only if it seeds twice.

#### Measured by reading, 2026-09-27

The live `seed_default_workout` (read with `pg_get_functiondef`) tests
`exists (select 1 from public.workouts where user_id = auth.uid())` and then inserts,
with no lock, and `workouts` has no constraint that would reject a second default. Under
READ COMMITTED two overlapping calls both see no rows and both insert, so the race exists
by construction. `WorkoutPicker` calls `fetchOrSeedWorkouts` from a mount effect and
`main.jsx` renders under `StrictMode`, so a new user in development makes two overlapping
calls.

Not run: a live reproduction needs a user with no workouts, meaning a new account on the
production project, and two concurrent connections, which the SQL tool used here does not
offer. The candidate fix is `perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));`
as the function's first statement, after which the second call waits and finds the first
call's workout. Whether to apply it without a reproduction is the owner's call.
