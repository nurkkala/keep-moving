/**
 * Folds the built CSS and JS into index.html so the snapshot page is a single
 * file that opens from anywhere — no server, no relative asset paths.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "snapshot-dist";
let html = readFileSync(join(DIR, "index.html"), "utf8");

for (const f of readdirSync(join(DIR, "assets"))) {
  const body = readFileSync(join(DIR, "assets", f), "utf8");
  // Replacements must be FUNCTIONS. A bundle is full of $ sequences, and in
  // String.replace "$'" means "everything after the match" — passing the
  // bundle as a replacement string silently re-inserts the tag being replaced.
  if (f.endsWith(".css")) {
    html = html.replace(
      new RegExp(`<link[^>]*href="[^"]*${f}"[^>]*>`),
      () => `<style>\n${body}\n</style>`
    );
  } else if (f.endsWith(".js")) {
    // </script> inside the bundle would close the tag early.
    const safe = body.replace(/<\/script>/g, "<\\/script>");
    html = html.replace(
      new RegExp(`<script[^>]*src="[^"]*${f}"[^>]*></script>`),
      () => `<script type="module">\n${safe}\n</script>`
    );
  }
}

if (/<(link|script)[^>]*(href|src)="[^"]*assets\//.test(html)) {
  console.error("inline-snapshot: an asset reference survived — not self-contained.");
  process.exit(1);
}

writeFileSync("coach-screens.html", html);
console.log(`coach-screens.html written (${Math.round(html.length / 1024)} kB, self-contained)`);
