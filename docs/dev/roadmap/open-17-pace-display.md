---
label: OPEN-17-pace-display
title: "Pace is computable and never shown"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:36:29
priority: 5
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:36:29.*

`CLAUDE.md` says pace comes from `actual_sec` recorded beside distance, and `describePace`
in `data.js` computes it. Nothing called it, so pace was never shown.

Recommendation: show it on distance rows in History and on the completion screen, in the
user's unit, which `useDistanceUnit` now supplies (TODO-5-session-distance, done). Otherwise delete
`describePace` with the rest of TODO-23-dead-code.

#### Ruled yes, queued 2026-09-27: show it

The owner chose to show pace: on distance sets in History and on the session's completion
screen, in the user's unit, through `describePace`.

#### Built 2026-09-27

Distance sets show pace beside the distance, in the user's unit: on History's set chips ("3 mi · 8:12 / mi") and on the session's completion screen. OPEN-14-tests-lint had already fixed `describePace` printing "8:60" and gave it tests. A set with no recorded time shows the distance alone.
