/**
 * Migration hygiene, without touching the network.
 *
 * Catches the half of schema drift that git can see on its own:
 *
 *   - a migration written but never committed, so a teammate's `db push`
 *     doesn't have it and the code expects a column nobody else has
 *   - a hand-named file, which breaks ordering because the filename timestamp
 *     *is* the version
 *   - two migrations claiming the same version
 *
 * The other half — whether the linked project actually has these applied —
 * needs credentials, and lives in check-drift.mjs.
 */
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIR = "supabase/migrations";
const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;

const problems = [];

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

if (!files.length) {
  console.error("check-migrations: no migrations found — wrong directory?");
  process.exit(1);
}

// --- filenames -------------------------------------------------------------
const versions = new Map();
for (const f of files) {
  const m = NAME.exec(f);
  if (!m) {
    problems.push(
      `${f}\n      doesn't match <14-digit-timestamp>_<lower_snake_case>.sql.\n` +
        `      Use \`make db-new NAME=...\` — the timestamp is the version, and\n` +
        `      inventing one causes drift that only surfaces as a failed push.`
    );
    continue;
  }
  const [, version] = m;
  if (versions.has(version)) {
    problems.push(`${f}\n      shares version ${version} with ${versions.get(version)}.`);
  }
  versions.set(version, f);
}

// --- committed? ------------------------------------------------------------
// `git ls-files` lists tracked paths; anything on disk but not listed is
// uncommitted, which is the failure mode that bites a second machine.
let tracked = new Set();
try {
  tracked = new Set(
    execFileSync("git", ["ls-files", DIR], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((p) => p.split("/").pop())
  );
} catch {
  console.log("check-migrations: not a git checkout — skipping the tracked-file check.");
  tracked = null;
}

if (tracked) {
  for (const f of files) {
    if (!tracked.has(f)) {
      problems.push(
        `${f}\n      exists on disk but isn't tracked by git. Commit it, or the\n` +
          `      schema and the code that needs it travel separately.`
      );
    }
  }
  for (const f of tracked) {
    if (!files.includes(f)) {
      problems.push(`${f}\n      is tracked by git but missing from ${DIR}.`);
    }
  }
}

// --- report ----------------------------------------------------------------
if (problems.length) {
  console.error(`\ncheck-migrations FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

console.log(`check-migrations: ${files.length} migrations, well-named and committed`);
