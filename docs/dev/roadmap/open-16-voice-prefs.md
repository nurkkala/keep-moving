---
label: OPEN-16-voice-prefs
title: "Voice preferences are stored but cannot be set"
state: done
added: 2026-09-27 11:14:57
closed: 2026-09-27 12:36:05
priority: 5
---

*Added 2026-09-27 11:14:57 · done 2026-09-27 12:36:05.*

`preferences` stored `voice_uri`, `voice_name` and `rate`, and the session screen read the
URI and rate, but no screen wrote them. `speech.js` carried `tierOf` and `prettyVoice`,
the remains of a voice picker, and nothing called either.

Recommendation: build a small voice picker in the preferences sheet, since voices differ a
great deal between devices and the coach is the app's main output. The alternative is to
drop the three columns and the two helpers.

#### Ruled yes, queued 2026-09-27: build the picker

The owner chose a voice picker over dropping the columns. Build: a voice list and a speed
control in the settings screen, with a sample line to hear the choice, writing
`voice_uri`, `voice_name` and `rate` through `savePrefs`. `tierOf` and `prettyVoice` in
`speech.js` are its starting point.

#### Built 2026-09-27

`VoicePicker` sits on the setup screen (the nav link and heading, formerly "Kit" and "Equipment", now read "Setup") under the distance unit. It lists this device's English voices grouped by `tierOf`, with an Automatic choice that names the best one; a speed slider from 0.7× to 1.3× that saves once it comes to rest; and "Hear it", which speaks a sample cue with the current choice. Voices are per device, so a saved voice missing here falls back to automatic and the picker says so. Tests cover `tierOf` and `prettyVoice`; `verify-build` checks the picker ships. Nobody has heard it yet.
