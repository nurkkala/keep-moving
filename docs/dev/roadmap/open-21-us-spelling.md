---
label: OPEN-21-us-spelling
title: "Should metres become meters in copy and identifiers?"
state: open
added: 2026-09-27 11:14:58
priority: 5
---

*Added 2026-09-27 11:14:58.*

The project writes "metres" and "kilometres" in UI copy (`EquipmentInventory`,
`ExerciseEditor`, `SessionScreen`), in identifiers (`toMetres`, `fromMetres`,
`METRES_PER_MILE`), and in `CLAUDE.md` and `docs/SCHEMA.md`. The UI also says "Colour
theme", and comments say "colour", "centred" and "favouring". The owner's standing rule is
US spelling everywhere.

Recommendation: change it all in one commit, identifiers included, since every caller is in
`src/`. The database has no column spelled either way. Left open because `CLAUDE.md` states
the convention in the British spelling, and that file is the owner's.
