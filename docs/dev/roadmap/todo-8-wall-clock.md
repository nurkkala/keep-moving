---
label: TODO-8-wall-clock
title: "Session time drifts from the wall clock"
state: done
added: 2026-09-27 11:14:56
closed: 2026-09-27 12:18:18
priority: 3
---

*Added 2026-09-27 11:14:56 · done 2026-09-27 12:18:18.*

The session clock added a fixed 100 ms per `setInterval` tick. Browsers throttle intervals
in a background tab or under a locked screen to a second or longer, so a 45-second hold
could run far longer when the phone dimmed. Separately, `totalSec` was measured from mount
to the tap on Save, which counted load time, paused time, and however long the completion
screen sat open.

Build: derive `elapsed` from `Date.now()` against a phase start that pausing adjusts, and
compute `totalSec` from the log (or from active time) at completion.

#### Built 2026-09-27

`elapsed` is now `Date.now()` minus an anchor that entering a phase resets, resuming re-derives, and "hold for another N" moves back. `totalSec` sums the spans the clock ran, so loading, pausing and the completion screen no longer count. A set the timer ends is logged at its target, since a late tick can overshoot it. Checked by `make build`; nobody has timed a set with the screen dimmed.
