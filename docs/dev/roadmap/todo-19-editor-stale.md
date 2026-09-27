---
label: TODO-19-editor-stale
title: "Workout editor pickers show stale results"
state: queued
added: 2026-09-27 11:14:58
priority: 5
---

*Added 2026-09-27 11:14:58.*

Two stale-result defects in `WorkoutEditor.jsx`:

- After "Create your own exercise", the code calls `setSearch("")` and `setActive([])`.
  When both are already empty the state does not change, the fetch effect does not rerun,
  and the new exercise is missing from the picker. Refetch explicitly.
- The rule builder's match-count effect has no cancellation, so a slow response can
  overwrite a newer count. Unverified.
