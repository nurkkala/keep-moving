---
label: TODO-9-target-sheet
title: "The target sheet corrupts a target on a type switch and wipes its note"
state: done
added: 2026-09-27 11:14:56
closed: 2026-09-27 12:18:50
priority: 3
---

*Added 2026-09-27 11:14:56 · done 2026-09-27 12:18:50.*

Two defects in `TargetSheet.jsx`, as found:

- Switching the target type keeps the number. A 30-second target becomes 30 meters (shown
  as 0.02 mi); a 5000-meter target saved as time becomes 5000 seconds. Reset the value to a
  default for the new type, or to the exercise's suggestion.
- `note` starts as `""` and is always sent, so every save wipes the note already stored on
  `exercise_targets`. The only reader, `fetchTargets`, is imported nowhere
  (TODO-23-dead-code), so a note is currently write-only. Load it with the target, or drop
  the field if nothing is meant to show it.

#### Built 2026-09-27

Switching type now resets the value: to the exercise's own value when switching back to its type, otherwise 30 seconds, 10 reps, or one mile or kilometer. The sheet loads the saved note with `fetchTargets(exerciseId)`, which takes an optional filter now, and fills the field unless the user has already typed. `fetchTargets` is therefore no longer dead code (TODO-23-dead-code updated).
