---
label: TODO-5-session-distance
title: "Distances are shown and entered in raw meters during a session"
state: done
added: 2026-09-27 11:14:56
closed: 2026-09-27 11:35:32
priority: 2
---

*Added 2026-09-27 11:14:56 · done 2026-09-27 11:35:32.*

`preferences.distance_unit` decides miles or kilometers, and `CLAUDE.md` makes it a
display concern over values stored in meters. Until 2026-09-27 only `TargetSheet` read
it. The session screen labeled a distance set "metres", stepped it by 100, called
`describeTarget` with no unit, and labeled its steppers "rep". Saying "done, 3" on a
three-mile run logged 3 meters. The workout picker, editor, and History fell back to
`"mi"` regardless of the preference.

Build: read the preference once where a session starts, pass the unit through, convert
spoken and stepped values with `toMetres`/`fromMetres`, and step by a sensible increment in
the user's unit. Unverified beyond `SessionScreen.jsx`: the review traced the picker,
editor and History defaults but nobody has run them.

#### Built 2026-09-27

`src/lib/distanceUnit.js` holds the unit once for every screen (`useDistanceUnit`), and
the equipment screen updates it when the preference changes, so open screens follow. The
session screen announces, shows and accepts distances in the user's unit, steps by 0.1 of
it, and converts spoken numbers to meters before logging. History's set chips format
distance too. Checked by `make check`; nobody has run a distance set since.

Left as is: spoken numbers are whole (no "3.1"), and "a few more" with no number moves a
distance by one whole unit.
