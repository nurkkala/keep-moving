---
label: OPEN-14-tests-lint
title: "Is there a test suite and a linter?"
state: done
added: 2026-09-27 11:14:57
closed: 2026-09-27 12:34:13
priority: 4
---

*Added 2026-09-27 11:14:57 · done 2026-09-27 12:34:13.*

`make check` built, verified the bundle, and checked migrations. Nothing tested behavior
and nothing linted. The parser defect in TODO-2-stated-count was a pure function with a
wrong table, the easiest kind of defect to pin in a unit test.

Recommendation: add Vitest (it shares Vite's config) with tests for `parseCommand`, the
distance conversions in `data.js`, and `describeTarget`, and ESLint with the React hooks
rules, which would flag the stale-dependency class of bug in the session screen. Wire both
into `make check` and CI. Out of scope: component or end-to-end tests against Supabase.

#### Ruled yes, queued 2026-09-27: Vitest and ESLint

The owner chose both, as recommended above: Vitest for `parseCommand`, the distance
conversions and `describeTarget`, ESLint with the React hooks rules, and both wired into
`make check` and CI. The fixes made on 2026-09-27 are the first things worth pinning.

#### Built 2026-09-27

Vitest 5 and ESLint 10 are dev dependencies; `make test` and `make lint` run them, `make check` runs both first, and CI runs both in its build job. 31 tests cover `parseCommand`, the distance conversions, `describeTarget` and `describePace`. Writing them found four defects, fixed the same day: "hold for another twenty" and "give me ten more seconds", the two phrasings the session screen documents for extending a hold, parsed as rep adjustments, so a timed set ignored them; the spoken target said "1 miles"; and pace could print "8:60".

ESLint enables the classic `rules-of-hooks` and `exhaustive-deps`, both clean. The plugin's newer React Compiler rules reported 11 errors and are left to OPEN-29-compiler-lint.
