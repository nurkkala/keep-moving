---
label: TODO-4-ci-drift-auth
title: "The CI drift job fails behind a green run"
state: done
added: 2026-09-27 11:14:55
closed: 2026-09-27 11:31:30
priority: 1
---

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:31:30.*

The drift job in `.github/workflows/ci.yml` failed on every run from 2026-09-20, when
the access token was added, to 2026-09-27. Run 35536333544 shows `supabase link` exiting
with "Authorization failed for the access token and project ref pair". The job carries
`continue-on-error: true`, so the run reported success and nothing surfaced the failure.

Two defects, as found:

- The token lacks access to the project. It may belong to another account or organization.
  Regenerating it from the account that owns the project is the likely fix; that is the
  owner's to do, through `gh secret set` so the value never enters a transcript.
- The "are the credentials present?" step tests `TOKEN` and `PROJECT` only. With
  `SUPABASE_DB_PASSWORD` unset (it still is), the job should skip with its notice. Add the
  password to the test.

`make db-check` run locally on 2026-09-27 reported 27 migrations agreeing, so the schema
itself has not drifted. Out of scope: removing `continue-on-error`, whose reason (a fork's
pull request cannot see secrets) still holds.

#### Resolved 2026-09-27

The owner generated a new token and set `SUPABASE_DB_PASSWORD`; the gate now tests all
three secrets. The next run linked and then failed in `check-drift.mjs`, which found no
JSON in `supabase migration list` output, though the same command prints JSON locally. The
script now asks for `--output-format json` by name and prints what came back when JSON is
missing. Run 36329829015: "27 migrations, local and remote agree".
