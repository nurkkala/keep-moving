---
label: TODO-13-discard-confirm
title: "Finished or edited work can be discarded without a confirmation"
state: done
added: 2026-09-27 11:14:57
closed: 2026-09-27 12:21:34
priority: 4
---

*Added 2026-09-27 11:14:57 · done 2026-09-27 12:21:34.*

The session's X and its "Discard" button threw away a finished or partly finished workout
with no confirmation, and `WorkoutEditor`'s Back dropped unsaved edits. Put each behind
`ConfirmDialog`, and in the editor ask only when something changed.

#### Built 2026-09-27

Both session exits now ask through `ConfirmDialog` once a set is logged, saying how many would be lost, and pause the clock while asking; Cancel restores the pause state it found. The editor's Back asks only when `dirty` is set. A spoken "keep going" while the dialog is open still unpauses, which is harmless and was left.
