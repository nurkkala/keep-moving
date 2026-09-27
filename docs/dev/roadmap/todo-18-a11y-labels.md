---
label: TODO-18-a11y-labels
title: "Accessible names read undefined or wrong"
state: done
added: 2026-09-27 11:14:58
closed: 2026-09-27 12:22:07
priority: 5
---

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:22:07.*

- `WorkoutEditor` built move and remove labels from the exercise name, so on a rule slot
  a screen reader said "Move undefined up" and "Remove undefined". Use the rule's
  description.
- The session's plus and minus buttons said "rep" on distance sets.
- A denied microphone permission left the listening button lit. The listener's error
  should turn listening off and say why.

#### Built 2026-09-27

Rule slots are labeled by their rule ("Move rule: 2 × arms up"). The distance steppers were relabeled with TODO-5-session-distance. `createListener` takes an `onDenied` callback; the session screen uses it to turn listening off and say the browser blocked the microphone.
