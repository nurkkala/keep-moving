---
label: OPEN-27-db-types
title: "Keep or drop the db:types script"
state: done
added: 2026-09-27 11:14:59
closed: 2026-09-27 12:11:15
priority: 7
---

*Added 2026-09-27 11:14:59 · done 2026-09-27 12:11:15.*

`npm run db:types` (and `make db-types`) writes `src/lib/database.types.ts` into a
JavaScript project. The file is not committed and nothing imports it.

Recommendation: remove the script and target. Adopt them only alongside a move to
TypeScript or JSDoc type checking, which would be its own decision.

#### Ruled yes, queued 2026-09-27: remove it

The owner chose to drop the script. Build: remove `db:types` from `package.json`, the
`db-types` target from the `Makefile`, and its row from the README.
