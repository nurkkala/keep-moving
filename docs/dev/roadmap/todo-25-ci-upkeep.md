---
label: TODO-25-ci-upkeep
title: "CI actions and runner image need updating"
state: queued
added: 2026-09-27 11:14:59
priority: 6
---

*Added 2026-09-27 11:14:59.*

From the annotations on run 35536333544:

- `supabase/setup-cli@v1` targets Node 20, which GitHub has deprecated; move to a release
  that targets Node 24 when one exists.
- `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19. Nothing here depends on the image,
  so this is a watch item: check the next run after that date.
