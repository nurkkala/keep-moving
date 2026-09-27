---
label: TODO-26-rls-perf
title: "Row level security policies re-evaluate auth.uid() per row"
state: done
added: 2026-09-27 11:14:59
closed: 2026-09-27 12:27:21
priority: 7
---

*Added 2026-09-27 11:14:59 · done 2026-09-27 12:27:21.*

The Supabase performance advisor on 2026-09-27 reported:

- 16 row level security policies calling `auth.uid()` directly, which Postgres re-evaluates
  per row. Wrapping it as `(select auth.uid())` evaluates it once.
- Four tables where a "write own" policy also applies to SELECT, overlapping the read
  policy. Restrict the write policies to insert, update and delete.
- Eight foreign keys with no covering index.

None matters at one user's data volume. One migration covers all three; run
`supabase db lint` and the advisors after it. The eleven "unused index" notices are an
artifact of little traffic and should be left alone.

#### Built 2026-09-27

Migration `20260927162446_rls_initplan_and_fk_indexes` wraps `auth.uid()` in a scalar subquery in all 16 policies, replaces the four `FOR ALL` write policies with insert, update and delete policies, and adds the eight indexes. Every policy grants what it granted before; the dry run for TODO-10-atomic-saves ran under these policies. After applying, the performance advisor reported only unused-index notices, now 19 with the new indexes, which stay alone as planned.
