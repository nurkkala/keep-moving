---
label: OPEN-14-tests-lint
title: "Is there a test suite and a linter?"
state: open
added: 2026-09-27 11:14:57
priority: 4
---

*Added 2026-09-27 11:14:57.*

`make check` builds, verifies the bundle, and checks migrations. Nothing tests behavior
and nothing lints. The parser defect in TODO-2-stated-count was a pure function with a
wrong table, the easiest kind of defect to pin in a unit test.

Recommendation: add Vitest (it shares Vite's config) with tests for `parseCommand`, the
distance conversions in `data.js`, and `describeTarget`, and ESLint with the React hooks
rules, which would flag the stale-dependency class of bug in the session screen. Wire both
into `make check` and CI. Out of scope: component or end-to-end tests against Supabase.
