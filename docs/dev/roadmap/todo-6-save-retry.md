---
label: TODO-6-save-retry
title: "A failed save loses the whole session"
state: done
added: 2026-09-27 11:14:56
closed: 2026-09-27 12:17:31
priority: 2
---

*Added 2026-09-27 11:14:56 · done 2026-09-27 12:17:31.*

When `saveSession` threw, `finish` set `error`, and the error branch rendered before the
completion screen. Its only control was "Back", which calls `onExit`, and the session log
lives in component state, so the workout just performed was gone.

Build: show the save error on the completion screen with a retry, keeping the log. A copy
in `localStorage` until the save succeeds would also survive a reload. Build that part only
if a failed save is ever seen in use.

#### Built 2026-09-27

A failed save now sets `saveError`, kept apart from `error`, so the completion screen stays up with the log, says the save failed, and relabels the button "Try again". The `localStorage` copy was not built.
