/**
 * Does the linked project actually match `supabase/migrations`?
 *
 * `supabase migration list` reports each version as local, remote, or both.
 * Two ways to disagree, and they fail differently:
 *
 *   local only   — written and committed, never applied. The code ships
 *                  expecting a column the database doesn't have.
 *   remote only  — applied out of band, never committed. The next `db push`
 *                  from a clean checkout fails on drift, and nobody can
 *                  reproduce the schema from the repo.
 *
 * Needs credentials, so it's separate from check-migrations.mjs, which runs
 * anywhere. Exits 0 when they agree, 1 when they don't, and 2 when it couldn't
 * find out — an unreachable database is not the same as a healthy one.
 */
import { execFileSync } from "node:child_process";

let raw;
try {
  raw = execFileSync("supabase", ["migration", "list"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  console.error("check-drift: couldn't reach the linked project.");
  console.error(`  ${(e.stderr || e.message || "").toString().trim().split("\n")[0]}`);
  console.error("  Is `supabase link` done, and are the credentials present?");
  process.exit(2);
}

// The CLI prints an update banner around the JSON; take the object line.
const line = raw.split("\n").find((l) => l.trim().startsWith("{"));
if (!line) {
  console.error("check-drift: no JSON in `supabase migration list` output.");
  process.exit(2);
}

const rows = JSON.parse(line).migrations ?? [];
const localOnly = rows.filter((r) => r.local && !r.remote).map((r) => r.local);
const remoteOnly = rows.filter((r) => r.remote && !r.local).map((r) => r.remote);

if (!localOnly.length && !remoteOnly.length) {
  console.log(`check-drift: ${rows.length} migrations, local and remote agree`);
  process.exit(0);
}

console.error("\ncheck-drift FAILED — local and the linked project disagree:\n");

if (localOnly.length) {
  console.error(`  ${localOnly.length} committed but NOT applied:`);
  for (const v of localOnly) console.error(`      ${v}`);
  console.error("      → run `make db-push`\n");
}

if (remoteOnly.length) {
  console.error(`  ${remoteOnly.length} applied but NOT in this checkout:`);
  for (const v of remoteOnly) console.error(`      ${v}`);
  console.error(
    "      → someone applied these out of band. Pull them into the repo\n" +
      "        (`supabase db pull`) rather than hand-naming a file to match.\n"
  );
}

process.exit(1);
