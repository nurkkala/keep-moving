---
label: OPEN-28-bundle-size
title: "Split the 520 kB bundle?"
state: ruled-no
added: 2026-09-27 11:14:59
closed: 2026-09-27 11:38:25
priority: 8
---

*Added 2026-09-27 11:14:59 · ruled no 2026-09-27 11:38:25.*

The production bundle is one 520 kB chunk (143 kB gzipped), over Vite's warning threshold.
Splitting the editors and History behind `React.lazy` would shrink the first load.

Recommendation: leave it. The app is used on a device that loads it once and keeps it, and
`verify-build.mjs` asserts every screen is in the bundle, a check that splitting would have
to be taught. Reopen if first load is ever noticeably slow on a phone.

#### Ruled no 2026-09-27

The owner chose to leave the bundle whole, for the reasons above. Reopen if first load is
ever noticeably slow on a phone.
