---
label: OPEN-21-us-spelling
title: "Should metres become meters in copy and identifiers?"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:11:49
priority: 5
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:11:49.*

Until 2026-09-27 the project wrote "metres" and "kilometres" in UI copy (`EquipmentInventory`,
`ExerciseEditor`, `SessionScreen`), in identifiers (`toMetres`, `fromMetres`,
`METRES_PER_MILE`), and in `CLAUDE.md` and `docs/SCHEMA.md`. The UI also said "Colour
theme", and comments said "colour", "centred" and "favouring". The owner's standing rule is
US spelling everywhere.

Recommendation: change it all in one commit, identifiers included, since every caller is in
`src/`. The database has no column spelled either way. Left open because `CLAUDE.md` states
the convention in the British spelling, and that file is the owner's.

#### Ruled yes, queued 2026-09-27: all of it, in one commit

The owner chose the full conversion: UI copy, identifiers, comments, `CLAUDE.md` and
`docs/SCHEMA.md`. Exempt: migration files already applied, which cannot change, and
quotations of the old spelling where a document records what the code once said.

Built the same day: 14 files, identifiers included (`toMeters`, `fromMeters`,
`METERS_PER_MILE`), plus `canceled` and `unrecognized`. The applied migrations were left as
they are.
