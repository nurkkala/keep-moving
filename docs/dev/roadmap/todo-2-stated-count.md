---
label: TODO-2-stated-count
title: "A stated final count is read as a shortfall"
state: done
added: 2026-09-27 11:14:55
closed: 2026-09-27 11:14:55
---

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:14:55.*

`parseCommand` in `speech.js` listed "only did" and "stopped at" among the words meaning
fewer, so "I only did eight" became `adjust -8`. Against a target of 12 the app logged 4.
The listening hint under the session controls offers that exact phrase as an example.

Fixed by testing for "only did", "only got", "only managed" and "stopped at" before the
adjustments, and returning an absolute count. "Two short" and "I couldn't do the last two"
still read as deltas, which they are. Checked by running `parseCommand` over eleven phrases
in Node on 2026-09-27; the file has no test suite to hold that check (OPEN-14-tests-lint).
