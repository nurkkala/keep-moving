---
label: OPEN-17-pace-display
title: "Pace is computable and never shown"
state: queued
added: 2026-09-27 11:14:58
priority: 5
---

*Added 2026-09-27 11:14:58.*

`CLAUDE.md` says pace comes from `actual_sec` recorded beside distance, and `describePace`
in `data.js` computes it. Nothing calls it, so pace is never shown.

Recommendation: show it on distance rows in History and on the completion screen, in the
user's unit, which `useDistanceUnit` now supplies (TODO-5-session-distance, done). Otherwise delete
`describePace` with the rest of TODO-23-dead-code.

#### Ruled yes, queued 2026-09-27: show it

The owner chose to show pace: on distance sets in History and on the session's completion
screen, in the user's unit, through `describePace`.
