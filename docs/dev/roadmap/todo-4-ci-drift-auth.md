---
label: TODO-4-ci-drift-auth
title: "The CI drift job fails behind a green run"
state: queued
added: 2026-09-27 11:14:55
priority: 1
---

*Added 2026-09-27 11:14:55.*

The drift job in `.github/workflows/ci.yml` has failed on every run since the access
token was added on 2026-09-20. Run 35536333544 shows `supabase link` exiting with
"Authorization failed for the access token and project ref pair". The job carries
`continue-on-error: true`, so the run reports success and nothing surfaces the failure.

Two defects:

- The token lacks access to the project. It may belong to another account or organization.
  Regenerating it from the account that owns the project is the likely fix; that is the
  owner's to do, through `gh secret set` so the value never enters a transcript.
- The "are the credentials present?" step tests `TOKEN` and `PROJECT` only. With
  `SUPABASE_DB_PASSWORD` unset (it still is), the job should skip with its notice. Add the
  password to the test.

`make db-check` run locally on 2026-09-27 reported 27 migrations agreeing, so the schema
itself has not drifted. Out of scope: removing `continue-on-error`, whose reason (a fork's
pull request cannot see secrets) still holds.
