---
label: TODO-3-rest-voice
title: "Voice completion outside the work phase closes the upcoming set"
state: done
added: 2026-09-27 11:14:55
closed: 2026-09-27 11:14:55
---

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:14:55.*

A spoken "done" (or "next", "finished", "got it") during a rest or the ready countdown
reached `closeOut("voice")`. The step at `idx` is the upcoming one, so the set was closed
before it began, with the rest's elapsed seconds recorded as its time.

Fixed: outside the work phase "done" now calls `startNow`, the same as the button
(TODO-1-start-now). "Skip" during a rest still skips the upcoming exercise, deliberately:
that step is the one the user is declining, and it is logged as skipped with no work.
