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
