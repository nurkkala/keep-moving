---
label: OPEN-17-pace-display
title: "Pace is computable and never shown"
state: open
added: 2026-09-27 11:14:58
priority: 5
---

*Added 2026-09-27 11:14:58.*

`CLAUDE.md` says pace comes from `actual_sec` recorded beside distance, and `describePace`
in `data.js` computes it. Nothing calls it, so pace is never shown.

Recommendation: show it on distance rows in History and on the completion screen, in the
user's unit (depends on TODO-5-session-distance for the unit plumbing). Otherwise delete
`describePace` with the rest of TODO-23-dead-code.
