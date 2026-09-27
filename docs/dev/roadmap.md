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

## Contents

| # | Item | Status |
| --- | --- | --- |
| TODO-1-start-now | [Cutting a rest short logs the next exercise as skipped](#todo-1-start-now--cutting-a-rest-short-logs-the-next-exercise-as-skipped) | ✅ done |
| TODO-2-stated-count | [A stated final count is read as a shortfall](#todo-2-stated-count--a-stated-final-count-is-read-as-a-shortfall) | ✅ done |
| TODO-3-rest-voice | [Voice completion outside the work phase closes the upcoming set](#todo-3-rest-voice--voice-completion-outside-the-work-phase-closes-the-upcoming-set) | ✅ done |
| TODO-4-ci-drift-auth | [The CI drift job fails behind a green run](#todo-4-ci-drift-auth--the-ci-drift-job-fails-behind-a-green-run) | ✅ done |
| TODO-5-session-distance | [Distances are shown and entered in raw meters during a session](#todo-5-session-distance--distances-are-shown-and-entered-in-raw-meters-during-a-session) | ✅ done |
| TODO-6-save-retry | [A failed save loses the whole session](#todo-6-save-retry--a-failed-save-loses-the-whole-session) | 🔨 queued |
| OPEN-7-self-hearing | [The coach may hear its own cues](#open-7-self-hearing--the-coach-may-hear-its-own-cues) | 💭 open |
| TODO-8-wall-clock | [Session time drifts from the wall clock](#todo-8-wall-clock--session-time-drifts-from-the-wall-clock) | 🔨 queued |
| TODO-9-target-sheet | [The target sheet corrupts a target on a type switch and wipes its note](#todo-9-target-sheet--the-target-sheet-corrupts-a-target-on-a-type-switch-and-wipes-its-note) | 🔨 queued |
| TODO-10-atomic-saves | [Exercise and workout saves can half-succeed](#todo-10-atomic-saves--exercise-and-workout-saves-can-half-succeed) | 🔨 queued |
| OPEN-11-rest-pref | [Should preferences.rest_sec drive the rest timer?](#open-11-rest-pref--should-preferencesrest_sec-drive-the-rest-timer) | ✅ done |
| TODO-12-silent-errors | [Failed loads render as empty states](#todo-12-silent-errors--failed-loads-render-as-empty-states) | 🔨 queued |
| TODO-13-discard-confirm | [Finished or edited work can be discarded without a confirmation](#todo-13-discard-confirm--finished-or-edited-work-can-be-discarded-without-a-confirmation) | 🔨 queued |
| OPEN-14-tests-lint | [Is there a test suite and a linter?](#open-14-tests-lint--is-there-a-test-suite-and-a-linter) | 💭 open |
| TODO-15-leaked-passwords | [Turn on leaked-password protection](#todo-15-leaked-passwords--turn-on-leaked-password-protection) | 🔨 queued |
| OPEN-16-voice-prefs | [Voice preferences are stored but cannot be set](#open-16-voice-prefs--voice-preferences-are-stored-but-cannot-be-set) | 💭 open |
| OPEN-17-pace-display | [Pace is computable and never shown](#open-17-pace-display--pace-is-computable-and-never-shown) | 💭 open |
| TODO-18-a11y-labels | [Accessible names read undefined or wrong](#todo-18-a11y-labels--accessible-names-read-undefined-or-wrong) | 🔨 queued |
| TODO-19-editor-stale | [Workout editor pickers show stale results](#todo-19-editor-stale--workout-editor-pickers-show-stale-results) | 🔨 queued |
| TODO-20-history-stat | [The history summary divides all-time minutes by at most 40 sessions](#todo-20-history-stat--the-history-summary-divides-all-time-minutes-by-at-most-40-sessions) | 🔨 queued |
| OPEN-21-us-spelling | [Should metres become meters in copy and identifiers?](#open-21-us-spelling--should-metres-become-meters-in-copy-and-identifiers) | ✅ done |
| TODO-22-kinds-copy | [ExerciseEditor redeclares the exercise kinds](#todo-22-kinds-copy--exerciseeditor-redeclares-the-exercise-kinds) | 🔨 queued |
| TODO-23-dead-code | [Unused exports in data.js and speech.js](#todo-23-dead-code--unused-exports-in-datajs-and-speechjs) | 🔨 queued |
| OPEN-24-double-seed | [The default workout may seed twice in development](#open-24-double-seed--the-default-workout-may-seed-twice-in-development) | 💭 open |
| TODO-25-ci-upkeep | [CI actions and runner image need updating](#todo-25-ci-upkeep--ci-actions-and-runner-image-need-updating) | 🔨 queued |
| TODO-26-rls-perf | [Row level security policies re-evaluate auth.uid() per row](#todo-26-rls-perf--row-level-security-policies-re-evaluate-authuid-per-row) | 🔨 queued |
| OPEN-27-db-types | [Keep or drop the db:types script](#open-27-db-types--keep-or-drop-the-dbtypes-script) | ✅ done |
| OPEN-28-bundle-size | [Split the 520 kB bundle?](#open-28-bundle-size--split-the-520-kb-bundle) | 🚫 ruled no |

## Open

### OPEN-7-self-hearing — The coach may hear its own cues

*Added 2026-09-27 11:14:56.*

`CLAUDE.md` requires the coach to ignore audio while it speaks. The listener checks
`isMuted()` when a recognition result arrives. Final results can arrive after an
utterance's `onend`, so cues such as "Say done when you finish" or "Rest. Next, Plank"
might come back unmuted and close a set or, since TODO-3-rest-voice, end a rest.

Unverified: this was inferred from reading `speech.js`. Settle it first by running a session
in Chrome with the speaker audible to the microphone and logging what the listener hears.
If it reproduces, the likely fix is to keep the mute on for a short tail after `onend`, or to
drop results whose timestamps overlap speech.

### OPEN-14-tests-lint — Is there a test suite and a linter?

*Added 2026-09-27 11:14:57.*

`make check` builds, verifies the bundle, and checks migrations. Nothing tests behavior
and nothing lints. The parser defect in TODO-2-stated-count was a pure function with a
wrong table, the easiest kind of defect to pin in a unit test.

Recommendation: add Vitest (it shares Vite's config) with tests for `parseCommand`, the
distance conversions in `data.js`, and `describeTarget`, and ESLint with the React hooks
rules, which would flag the stale-dependency class of bug in the session screen. Wire both
into `make check` and CI. Out of scope: component or end-to-end tests against Supabase.

### OPEN-16-voice-prefs — Voice preferences are stored but cannot be set

*Added 2026-09-27 11:14:57.*

`preferences` stores `voice_uri`, `voice_name` and `rate`, and the session screen reads the
URI and rate, but no screen writes them. `speech.js` carries `tierOf` and `prettyVoice`,
the remains of a voice picker, and nothing calls either.

Recommendation: build a small voice picker in the preferences sheet, since voices differ a
great deal between devices and the coach is the app's main output. The alternative is to
drop the three columns and the two helpers.

### OPEN-17-pace-display — Pace is computable and never shown

*Added 2026-09-27 11:14:58.*

`CLAUDE.md` says pace comes from `actual_sec` recorded beside distance, and `describePace`
in `data.js` computes it. Nothing calls it, so pace is never shown.

Recommendation: show it on distance rows in History and on the completion screen, in the
user's unit, which `useDistanceUnit` now supplies (TODO-5-session-distance, done). Otherwise delete
`describePace` with the rest of TODO-23-dead-code.

### OPEN-24-double-seed — The default workout may seed twice in development

*Added 2026-09-27 11:14:59.*

Under React StrictMode in development, effects run twice, so `fetchOrSeedWorkouts` may run
twice concurrently. If `seed_default_workout` checks for existing workouts without a lock
or a unique constraint, both calls can seed. Unverified: reproduce against a fresh user
before changing anything. A unique constraint or an advisory lock in the function would
close it; production is unaffected, since StrictMode's double run is development-only.

## Queue

### TODO-6-save-retry — A failed save loses the whole session

*Added 2026-09-27 11:14:56.*

When `saveSession` throws, `finish` sets `error`, and the error branch renders before the
completion screen. Its only control is "Back", which calls `onExit`, and the session log
lives in component state, so the workout just performed is gone.

Build: show the save error on the completion screen with a retry, keeping the log. A copy
in `localStorage` until the save succeeds would also survive a reload. Build that part only
if a failed save is ever seen in use.

### TODO-8-wall-clock — Session time drifts from the wall clock

*Added 2026-09-27 11:14:56.*

The session clock adds a fixed 100 ms per `setInterval` tick. Browsers throttle intervals
in a background tab or under a locked screen to a second or longer, so a 45-second hold
can run far longer when the phone dims. Separately, `totalSec` is measured from mount to
the tap on Save, which counts load time, paused time, and however long the completion
screen sat open.

Build: derive `elapsed` from `Date.now()` against a phase start that pausing adjusts, and
compute `totalSec` from the log (or from active time) at completion.

### TODO-9-target-sheet — The target sheet corrupts a target on a type switch and wipes its note

*Added 2026-09-27 11:14:56.*

Two defects in `TargetSheet.jsx`:

- Switching the target type keeps the number. A 30-second target becomes 30 meters (shown
  as 0.02 mi); a 5000-meter target saved as time becomes 5000 seconds. Reset the value to a
  default for the new type, or to the exercise's suggestion.
- `note` starts as `""` and is always sent, so every save wipes the note already stored on
  `exercise_targets`. The only reader, `fetchTargets`, is imported nowhere
  (TODO-23-dead-code), so a note is currently write-only. Load it with the target, or drop
  the field if nothing is meant to show it.

### TODO-10-atomic-saves — Exercise and workout saves can half-succeed

*Added 2026-09-27 11:14:56.*

`CLAUDE.md` routes multi-row writes through `security invoker` RPCs. Two saves do not:

- `ExerciseEditor` updates the exercise, then replaces its tags with a delete followed by an
  insert (`data.js` near line 156). A failed insert leaves the exercise with no tags. On
  create, a failed tag write leaves the exercise saved without tags, and a retry makes a
  duplicate.
- `WorkoutEditor` calls `updateWorkout` and `saveWorkoutExercises` independently, so either
  can succeed alone.

Build: one RPC per save, in a migration, following `save_workout_exercises`.

### TODO-12-silent-errors — Failed loads render as empty states

*Added 2026-09-27 11:14:57.*

Several loads fail into an empty state:

- `History` "Clear history" rejects with no handler and shows nothing.
- `fetchPerformanceHistory` failing shows "You haven't done this one yet."
- `WorkoutPicker`'s `fetchWorkoutExercises` failing shows an empty list.
- `WorkoutEditor`'s `fetchExercises` failing shows "Nothing matches those filters."

And every load error in `WorkoutPicker` tells the user to check `VITE_SUPABASE_URL`, which
is wrong for a network or row level security failure. Show the error where the content
would have been, and name configuration only when `isConfigured` is false.

### TODO-13-discard-confirm — Finished or edited work can be discarded without a confirmation

*Added 2026-09-27 11:14:57.*

The session's X and its "Discard" button throw away a finished or partly finished workout
with no confirmation, and `WorkoutEditor`'s Back drops unsaved edits. Put each behind
`ConfirmDialog`, and in the editor ask only when something changed.

### TODO-15-leaked-passwords — Turn on leaked-password protection

*Added 2026-09-27 11:14:57.*

The Supabase security advisor reports leaked-password protection disabled on 2026-09-27.
It checks new passwords against HaveIBeenPwned. It is a dashboard toggle under Auth, with
no migration and nothing to build:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### TODO-18-a11y-labels — Accessible names read undefined or wrong

*Added 2026-09-27 11:14:58.*

- `WorkoutEditor` builds move and remove labels from the exercise name, so on a rule slot
  a screen reader says "Move undefined up" and "Remove undefined". Use the rule's
  description.
- The session's plus and minus buttons say "rep" on distance sets.
- A denied microphone permission leaves the listening button lit. The listener's error
  should turn listening off and say why.

### TODO-19-editor-stale — Workout editor pickers show stale results

*Added 2026-09-27 11:14:58.*

Two stale-result defects in `WorkoutEditor.jsx`:

- After "Create your own exercise", the code calls `setSearch("")` and `setActive([])`.
  When both are already empty the state does not change, the fetch effect does not rerun,
  and the new exercise is missing from the picker. Refetch explicitly.
- The rule builder's match-count effect has no cancellation, so a slow response can
  overwrite a newer count. Unverified.

### TODO-20-history-stat — The history summary divides all-time minutes by at most 40 sessions

*Added 2026-09-27 11:14:58.*

The History header reads "N min across M sessions". `N` is all-time minutes from
`fetchKindTotals`, and `M` is `sessions.length`, which `fetchHistory` caps at 40. Past 40
sessions the line pairs two different populations. Count sessions in the same query as the
totals.

### TODO-22-kinds-copy — ExerciseEditor redeclares the exercise kinds

*Added 2026-09-27 11:14:58.*

`ExerciseEditor.jsx` declares its own `const KINDS` as an array of labels. `CLAUDE.md`
names `components/KindBadge.jsx` as the one definition, after four drifting copies had to
be merged. Derive the list from the imported `KINDS`.

### TODO-23-dead-code — Unused exports in data.js and speech.js

*Added 2026-09-27 11:14:58.*

Exported and imported nowhere: `describePace` (see OPEN-17-pace-display),
`fetchWorkoutsForDay`, `previewWorkout`, `fetchTargets` (see TODO-9-target-sheet) and
`deleteSession` in `data.js`. `formatDistance` and `fetchWorkouts` are used only inside
`data.js` and need not be exported. In `speech.js`, `tierOf` and `prettyVoice` are unused
(see OPEN-16-voice-prefs) and `current` is written and never read.

Also add a comment at `clearHistory`: its `.eq("user_id", …)` looks like the hand filtering
`CLAUDE.md` forbids, but PostgREST refuses a delete with no filter, and row level security
still does the access control. Checked by grep on 2026-09-27.

### TODO-25-ci-upkeep — CI actions and runner image need updating

*Added 2026-09-27 11:14:59.*

From the annotations on run 35536333544:

- `supabase/setup-cli@v1` targets Node 20, which GitHub has deprecated; move to a release
  that targets Node 24 when one exists.
- `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19. Nothing here depends on the image,
  so this is a watch item: check the next run after that date.

### TODO-26-rls-perf — Row level security policies re-evaluate auth.uid() per row

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

## Settled

### OPEN-11-rest-pref — Should preferences.rest_sec drive the rest timer?

*Added 2026-09-27 11:14:57 · done 2026-09-27 12:15:46.*

`preferences.rest_sec` was read by `fetchPrefs` and writable through `savePrefs`, but
nothing used it: rest length came from `workouts.rest_sec`, falling back to 15.
`CLAUDE.md` asks that a stored value the app does not honor be removed.

Recommendation: drop the column. Rest length belongs to a workout, where it is already set
and honored. Keep it only if a per-user default for new workouts is wanted, in which case
`WorkoutPicker`'s hard-coded 15 for a new workout should read it.

#### Ruled yes, queued 2026-09-27: drop the column

The owner chose to drop it. Build: a migration removing `preferences.rest_sec`, and the
field removed from `fetchPrefs`, `savePrefs` and the defaults in `data.js`. Rest stays a
property of each workout.

Built the same day: `data.js` stopped selecting and writing the column, and migration
`20260927161218_drop_preferences_rest_sec` dropped it and commented `workouts.rest_sec`
with the real fallback. Applied to the linked project; `make db-check` reported 28
migrations agreeing.

### OPEN-21-us-spelling — Should metres become meters in copy and identifiers?

*Added 2026-09-27 11:14:58 · done 2026-09-27 12:11:49.*

Until 2026-09-27 the project wrote "metres" and "kilometres" in UI copy (`EquipmentInventory`,
`ExerciseEditor`, `SessionScreen`), in identifiers (`toMetres`, `fromMetres`,
`METRES_PER_MILE`), and in `CLAUDE.md` and `docs/SCHEMA.md`. The UI also said "Colour
theme", and comments said "colour", "centred" and "favouring". The owner's standing rule is
US spelling everywhere.

Recommendation: change it all in one commit, identifiers included, since every caller is in
`src/`. The database has no column spelled either way. Left open because `CLAUDE.md` states
the convention in the British spelling, and that file is the owner's.

#### Ruled yes, queued 2026-09-27: all of it, in one commit

The owner chose the full conversion: UI copy, identifiers, comments, `CLAUDE.md` and
`docs/SCHEMA.md`. Exempt: migration files already applied, which cannot change, and
quotations of the old spelling where a document records what the code once said.

Built the same day: 14 files, identifiers included (`toMeters`, `fromMeters`,
`METERS_PER_MILE`), plus `canceled` and `unrecognized`. The applied migrations were left as
they are.

### OPEN-27-db-types — Keep or drop the db:types script

*Added 2026-09-27 11:14:59 · done 2026-09-27 12:11:15.*

`npm run db:types` (and `make db-types`) writes `src/lib/database.types.ts` into a
JavaScript project. The file is not committed and nothing imports it.

Recommendation: remove the script and target. Adopt them only alongside a move to
TypeScript or JSDoc type checking, which would be its own decision.

#### Ruled yes, queued 2026-09-27: remove it

The owner chose to drop the script. Build: remove `db:types` from `package.json`, the
`db-types` target from the `Makefile`, and its row from the README.

### OPEN-28-bundle-size — Split the 520 kB bundle?

*Added 2026-09-27 11:14:59 · ruled no 2026-09-27 11:38:25.*

The production bundle is one 520 kB chunk (143 kB gzipped), over Vite's warning threshold.
Splitting the editors and History behind `React.lazy` would shrink the first load.

Recommendation: leave it. The app is used on a device that loads it once and keeps it, and
`verify-build.mjs` asserts every screen is in the bundle, a check that splitting would have
to be taught. Reopen if first load is ever noticeably slow on a phone.

#### Ruled no 2026-09-27

The owner chose to leave the bundle whole, for the reasons above. Reopen if first load is
ever noticeably slow on a phone.

### TODO-5-session-distance — Distances are shown and entered in raw meters during a session

*Added 2026-09-27 11:14:56 · done 2026-09-27 11:35:32.*

`preferences.distance_unit` decides miles or kilometers, and `CLAUDE.md` makes it a
display concern over values stored in meters. Until 2026-09-27 only `TargetSheet` read
it. The session screen labeled a distance set "metres", stepped it by 100, called
`describeTarget` with no unit, and labeled its steppers "rep". Saying "done, 3" on a
three-mile run logged 3 meters. The workout picker, editor, and History fell back to
`"mi"` regardless of the preference.

Build: read the preference once where a session starts, pass the unit through, convert
spoken and stepped values with `toMetres`/`fromMetres`, and step by a sensible increment in
the user's unit. Unverified beyond `SessionScreen.jsx`: the review traced the picker,
editor and History defaults but nobody has run them.

#### Built 2026-09-27

`src/lib/distanceUnit.js` holds the unit once for every screen (`useDistanceUnit`), and
the equipment screen updates it when the preference changes, so open screens follow. The
session screen announces, shows and accepts distances in the user's unit, steps by 0.1 of
it, and converts spoken numbers to meters before logging. History's set chips format
distance too. Checked by `make check`; nobody has run a distance set since.

Left as is: spoken numbers are whole (no "3.1"), and "a few more" with no number moves a
distance by one whole unit.

### TODO-4-ci-drift-auth — The CI drift job fails behind a green run

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

### TODO-1-start-now — Cutting a rest short logs the next exercise as skipped

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:14:55.*

The large primary button reads "Start now" during the opening countdown and during a rest.
It called `closeOut("skipped")`, and by then `idx` already pointed at the step about to
begin, so cutting a rest short logged the upcoming exercise as skipped with zero work and
moved on past it. On the ready screen the same tap skipped the first exercise.

Fixed in `SessionScreen.jsx` with a `startNow` callback that says "Begin." and enters the
work phase. The button calls it outside the work phase. Checked by `make check` and by
reading the diff; nobody has walked a session on a device since.

### TODO-2-stated-count — A stated final count is read as a shortfall

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:14:55.*

`parseCommand` in `speech.js` listed "only did" and "stopped at" among the words meaning
fewer, so "I only did eight" became `adjust -8`. Against a target of 12 the app logged 4.
The listening hint under the session controls offers that exact phrase as an example.

Fixed by testing for "only did", "only got", "only managed" and "stopped at" before the
adjustments, and returning an absolute count. "Two short" and "I couldn't do the last two"
still read as deltas, which they are. Checked by running `parseCommand` over eleven phrases
in Node on 2026-09-27; the file has no test suite to hold that check (OPEN-14-tests-lint).

### TODO-3-rest-voice — Voice completion outside the work phase closes the upcoming set

*Added 2026-09-27 11:14:55 · done 2026-09-27 11:14:55.*

A spoken "done" (or "next", "finished", "got it") during a rest or the ready countdown
reached `closeOut("voice")`. The step at `idx` is the upcoming one, so the set was closed
before it began, with the rest's elapsed seconds recorded as its time.

Fixed: outside the work phase "done" now calls `startNow`, the same as the button
(TODO-1-start-now). "Skip" during a rest still skips the upcoming exercise, deliberately:
that step is the one the user is declining, and it is logged as skipped with no work.
