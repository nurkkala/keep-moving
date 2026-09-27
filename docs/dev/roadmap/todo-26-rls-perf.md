---
label: TODO-26-rls-perf
title: "Row level security policies re-evaluate auth.uid() per row"
state: queued
added: 2026-09-27 11:14:59
priority: 7
---

*Added 2026-09-27 11:14:59.*

The Supabase performance advisor on 2026-09-27 reported:

- 16 row level security policies calling `auth.uid()` directly, which Postgres re-evaluates
  per row. Wrapping it as `(select auth.uid())` evaluates it once.
- Four tables where a "write own" policy also applies to SELECT, overlapping the read
  policy. Restrict the write policies to insert, update and delete.
- Eight foreign keys with no covering index.

None matters at one user's data volume. One migration covers all three; run
`supabase db lint` and the advisors after it. The eleven "unused index" notices are an
artifact of little traffic and should be left alone.
