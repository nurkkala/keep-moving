---
label: TODO-22-kinds-copy
title: "ExerciseEditor redeclares the exercise kinds"
state: queued
added: 2026-09-27 11:14:58
priority: 6
---

*Added 2026-09-27 11:14:58.*

`ExerciseEditor.jsx` declares its own `const KINDS` as an array of labels. `CLAUDE.md`
names `components/KindBadge.jsx` as the one definition, after four drifting copies had to
be merged. Derive the list from the imported `KINDS`.
