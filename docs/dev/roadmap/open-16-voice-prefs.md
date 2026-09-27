---
label: OPEN-16-voice-prefs
title: "Voice preferences are stored but cannot be set"
state: queued
added: 2026-09-27 11:14:57
priority: 5
---

*Added 2026-09-27 11:14:57.*

`preferences` stores `voice_uri`, `voice_name` and `rate`, and the session screen reads the
URI and rate, but no screen writes them. `speech.js` carries `tierOf` and `prettyVoice`,
the remains of a voice picker, and nothing calls either.

Recommendation: build a small voice picker in the preferences sheet, since voices differ a
great deal between devices and the coach is the app's main output. The alternative is to
drop the three columns and the two helpers.

#### Ruled yes, queued 2026-09-27: build the picker

The owner chose a voice picker over dropping the columns. Build: a voice list and a speed
control in the settings screen, with a sample line to hear the choice, writing
`voice_uri`, `voice_name` and `rate` through `savePrefs`. `tierOf` and `prettyVoice` in
`speech.js` are its starting point.
