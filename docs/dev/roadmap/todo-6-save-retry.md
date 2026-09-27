---
label: TODO-6-save-retry
title: "A failed save loses the whole session"
state: queued
added: 2026-09-27 11:14:56
priority: 2
---

*Added 2026-09-27 11:14:56.*

When `saveSession` throws, `finish` sets `error`, and the error branch renders before the
completion screen. Its only control is "Back", which calls `onExit`, and the session log
lives in component state, so the workout just performed is gone.

Build: show the save error on the completion screen with a retry, keeping the log. A copy
in `localStorage` until the save succeeds would also survive a reload. Build that part only
if a failed save is ever seen in use.
