---
label: TODO-1-start-now
title: "Cutting a rest short logs the next exercise as skipped"
state: done
added: 2026-09-27 11:14:55
closed: 2026-09-27 11:14:55
---

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:14:55.*

The large primary button reads "Start now" during the opening countdown and during a rest.
It called `closeOut("skipped")`, and by then `idx` already pointed at the step about to
begin, so cutting a rest short logged the upcoming exercise as skipped with zero work and
moved on past it. On the ready screen the same tap skipped the first exercise.

Fixed in `SessionScreen.jsx` with a `startNow` callback that says "Begin." and enters the
work phase. The button calls it outside the work phase. Checked by `make check` and by
reading the diff; nobody has walked a session on a device since.
