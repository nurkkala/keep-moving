---
label: TODO-23-dead-code
title: "Unused exports in data.js and speech.js"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:23:53
priority: 6
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:23:53.*

Exported and imported nowhere, as found: `describePace` (see OPEN-17-pace-display),
`fetchWorkoutsForDay`, `previewWorkout` and `deleteSession` in `data.js`. (`fetchTargets`
was on this list until TODO-9-target-sheet put it to use.) `formatDistance` and `fetchWorkouts` are used only inside
`data.js` and need not be exported. In `speech.js`, `tierOf` and `prettyVoice` are unused
(see OPEN-16-voice-prefs) and `current` is written and never read.

Also add a comment at `clearHistory`: its `.eq("user_id", …)` looks like the hand filtering
`CLAUDE.md` forbids, but PostgREST refuses a delete with no filter, and row level security
still does the access control. Checked by grep on 2026-09-27.

#### Built 2026-09-27

Removed `fetchWorkoutsForDay`, `previewWorkout` and `deleteSession`, and stopped exporting `fetchWorkouts`. `formatDistance` stays exported: TODO-5-session-distance gave it callers in History and the session screen. `describePace`, `tierOf` and `prettyVoice` stay until OPEN-17-pace-display and OPEN-16-voice-prefs are ruled, since each ruling may use them.

`current` in `createSpeaker` was **not** dead. Holding the utterance keeps Chrome from garbage-collecting it mid-speech, which drops its `onend` and would leave recognition muted for good; it now carries a comment saying so. `clearHistory` carries the PostgREST comment. `docs/SCHEMA.md` described `fetchWorkoutsForDay` as how "what's on today" is found; it now describes the picker's client-side filter.
