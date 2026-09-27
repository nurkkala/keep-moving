---
label: TODO-18-a11y-labels
title: "Accessible names read undefined or wrong"
state: queued
added: 2026-09-27 11:14:58
priority: 5
---

*Added 2026-09-27 11:14:58.*

- `WorkoutEditor` builds move and remove labels from the exercise name, so on a rule slot
  a screen reader says "Move undefined up" and "Remove undefined". Use the rule's
  description.
- The session's plus and minus buttons say "rep" on distance sets.
- A denied microphone permission leaves the listening button lit. The listener's error
  should turn listening off and say why.
