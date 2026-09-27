---
label: OPEN-7-self-hearing
title: "The coach may hear its own cues"
state: open
added: 2026-09-27 11:14:56
priority: 3
---

*Added 2026-09-27 11:14:56.*

`CLAUDE.md` requires the coach to ignore audio while it speaks. The listener checks
`isMuted()` when a recognition result arrives. Final results can arrive after an
utterance's `onend`, so cues such as "Say done when you finish" or "Rest. Next, Plank"
might come back unmuted and close a set or, since TODO-3-rest-voice, end a rest.

Unverified: this was inferred from reading `speech.js`. Settle it first by running a session
in Chrome with the speaker audible to the microphone and logging what the listener hears.
If it reproduces, the likely fix is to keep the mute on for a short tail after `onend`, or to
drop results whose timestamps overlap speech.

#### Left open 2026-09-27

The owner chose to wait until the coach is seen acting on its own cues in use, and to
guard nothing speculatively. Reproduction steps stay as written above.
