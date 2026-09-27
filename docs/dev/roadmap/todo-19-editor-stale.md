---
label: TODO-19-editor-stale
title: "Workout editor pickers show stale results"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:22:32
priority: 5
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:22:32.*

Two stale-result defects in `WorkoutEditor.jsx`, as found:

- After "Create your own exercise", the code calls `setSearch("")` and `setActive([])`.
  When both are already empty the state does not change, the fetch effect does not rerun,
  and the new exercise is missing from the picker. Refetch explicitly.
- The rule builder's match-count effect has no cancellation, so a slow response can
  overwrite a newer count. Unverified.

#### Built 2026-09-27

The picker's search effect also depends on a `refresh` counter, which saving a new exercise bumps. The rule builder's match-count effect cancels on cleanup, so only the latest pick sets the count. Neither was reproduced before the fix; both were traced in the code.
