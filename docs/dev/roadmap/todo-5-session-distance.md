---
label: TODO-5-session-distance
title: "Distances are shown and entered in raw meters during a session"
state: queued
added: 2026-09-27 11:14:56
priority: 2
---

*Added 2026-09-27 11:14:56.*

`preferences.distance_unit` decides miles or kilometers, and `CLAUDE.md` makes it a
display concern over values stored in meters. Only `TargetSheet` reads it. The session
screen labels a distance set "metres", steps it by 100, calls `describeTarget` with no unit,
and labels its steppers "rep". Saying "done, 3" on a three-mile run logs 3 meters. The
workout picker, editor, and History fall back to `"mi"` regardless of the preference.

Build: read the preference once where a session starts, pass the unit through, convert
spoken and stepped values with `toMetres`/`fromMetres`, and step by a sensible increment in
the user's unit. Unverified beyond `SessionScreen.jsx`: the review traced the picker,
editor and History defaults but nobody has run them.
