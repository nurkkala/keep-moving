---
label: TODO-23-dead-code
title: "Unused exports in data.js and speech.js"
state: queued
added: 2026-09-27 11:14:58
priority: 6
---

*Added 2026-09-27 11:14:58.*

Exported and imported nowhere: `describePace` (see OPEN-17-pace-display),
`fetchWorkoutsForDay`, `previewWorkout` and `deleteSession` in `data.js`. (`fetchTargets`
was on this list until TODO-9-target-sheet put it to use.) `formatDistance` and `fetchWorkouts` are used only inside
`data.js` and need not be exported. In `speech.js`, `tierOf` and `prettyVoice` are unused
(see OPEN-16-voice-prefs) and `current` is written and never read.

Also add a comment at `clearHistory`: its `.eq("user_id", …)` looks like the hand filtering
`CLAUDE.md` forbids, but PostgREST refuses a delete with no filter, and row level security
still does the access control. Checked by grep on 2026-09-27.
