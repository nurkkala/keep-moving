The decision record for Keep Moving: work waiting to be done, questions waiting on a
decision, and what was ruled and why. It replaces the TODO list that used to sit at the
end of `CLAUDE.md`.

Most entries began in a scan of the repository on 2026-09-27, when the app had shipped
every screen and nothing was queued. The scan found defects in how a session is recorded
and several stored values the app never honors, which `CLAUDE.md` names as a broken
promise. Where an entry says it is unverified, a reviewer inferred it from reading the
code and nobody has reproduced it.

Settled product decisions live in `CLAUDE.md` and `docs/SCHEMA.md`: the no-makeup
schedule, one target per exercise, distance stored in meters. An entry here reopens one of
those only where it says so.

Tickets are files under `docs/dev/roadmap/`; this page is generated from them by the
`roadmap` tool (`make roadmap`), and `make check` fails when it is stale.
