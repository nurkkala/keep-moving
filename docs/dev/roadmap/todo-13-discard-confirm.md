---
label: TODO-13-discard-confirm
title: "Finished or edited work can be discarded without a confirmation"
state: queued
added: 2026-09-27 11:14:57
priority: 4
---

*Added 2026-09-27 11:14:57.*

The session's X and its "Discard" button throw away a finished or partly finished workout
with no confirmation, and `WorkoutEditor`'s Back drops unsaved edits. Put each behind
`ConfirmDialog`, and in the editor ask only when something changed.
