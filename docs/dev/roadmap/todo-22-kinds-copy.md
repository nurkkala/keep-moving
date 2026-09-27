---
label: TODO-22-kinds-copy
title: "ExerciseEditor redeclares the exercise kinds"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:23:10
priority: 6
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:23:10.*

`ExerciseEditor.jsx` declared its own `const KINDS` as an array of labels. `CLAUDE.md`
names `components/KindBadge.jsx` as the one definition, after four drifting copies had to
be merged. Derive the list from the imported `KINDS`.

#### Built 2026-09-27

`ExerciseEditor` imports `KINDS` and derives its option list with `Object.entries`, keeping the map's order.
