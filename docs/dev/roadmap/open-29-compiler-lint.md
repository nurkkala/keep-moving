---
label: OPEN-29-compiler-lint
title: "Adopt the React Compiler lint rules?"
state: open
added: 2026-09-27 12:33:58
priority: 7
---

*Added 2026-09-27 12:33:58.*


`eslint-plugin-react-hooks` 7 puts the React Compiler's rules in its recommended set. Run
over the code on 2026-09-27 they reported 11 errors across 8 components:

- `set-state-in-effect`, 8 times: an effect that starts with `setLoading(true)` or resets
  state before fetching, the pattern every screen here loads data with.
- `refs`, twice in `SessionScreen`: `commandRef.current = handleCommand` and
  `elapsedRef.current = elapsed`, written during render so callbacks read the latest value.
- `purity`, once: `useRef(Date.now())` in `SessionScreen`.

OPEN-14-tests-lint enabled only the classic `rules-of-hooks` and `exhaustive-deps` (both
errors, and clean). The question is whether to adopt the rest, which means reworking data
loading (a small `useAsync` hook, or deriving loading state from the request) and the
session screen's refs.

Recommendation: not yet. Nothing here is broken by these patterns, and the app does not run
the compiler, which is what the rules exist to protect. Reopen if the React Compiler is
adopted, or if the loading pattern gets reworked for another reason.
