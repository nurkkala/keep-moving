/**
 * A Vite build succeeds even when it produces a bundle containing almost no
 * application code — a module-scope throw or a build-time-constant branch lets
 * Rollup prune everything downstream as unreachable, and nothing warns you.
 * This happened once and shipped a bundle that was React plus an error string.
 *
 * So: assert that each screen actually made it into the output.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "dist/assets";

// One string per screen, chosen to be unique and unlikely to be reworded.
const SENTINELS = [
  ["auth", "Create an account"],
  ["picker", "Nothing scheduled today"],
  ["session", "Hands free"],
  ["workout editor", "Rest between sets"],
  ["exercise editor", "Suggested starting point"],
  ["target sheet", "Save target"],
  ["exercise detail", "Watch the demonstration"],
  ["history", "Clear saved history"],
];

let bundle = "";
try {
  for (const f of readdirSync(DIR)) {
    if (f.endsWith(".js")) bundle += readFileSync(join(DIR, f), "utf8");
  }
} catch {
  console.error("verify-build: no dist/assets — run `vite build` first.");
  process.exit(1);
}

const missing = SENTINELS.filter(([, s]) => !bundle.includes(s));

if (missing.length) {
  console.error("\nverify-build FAILED — these screens are not in the bundle:\n");
  for (const [name, s] of missing) console.error(`  ${name.padEnd(18)} (looked for "${s}")`);
  console.error(
    "\nUsually this means unreachable code was tree-shaken: check for a throw or\n" +
      "an always-false branch at module scope, and that env vars are set at build time.\n"
  );
  process.exit(1);
}

console.log(`verify-build: all ${SENTINELS.length} screens present (${Math.round(bundle.length / 1024)} kB)`);
