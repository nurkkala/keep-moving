---
label: TODO-8-wall-clock
title: "Session time drifts from the wall clock"
state: queued
added: 2026-09-27 11:14:56
priority: 3
---

*Added 2026-09-27 11:14:56.*

The session clock adds a fixed 100 ms per `setInterval` tick. Browsers throttle intervals
in a background tab or under a locked screen to a second or longer, so a 45-second hold
can run far longer when the phone dims. Separately, `totalSec` is measured from mount to
the tap on Save, which counts load time, paused time, and however long the completion
screen sat open.

Build: derive `elapsed` from `Date.now()` against a phase start that pausing adjusts, and
compute `totalSec` from the log (or from active time) at completion.
