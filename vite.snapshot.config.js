import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

const REAL_DATA = resolve("src/lib/coachData.js");
const MOCK_DATA = resolve("snapshots/mockData.js");
const REAL_SUPABASE = resolve("src/lib/supabase.js");

/**
 * Swaps the data layer for mocks, but only for imports coming from the
 * components — the mock itself still reaches the real module (via the
 * "@real-coachdata" alias) so the formatting helpers stay shared and the
 * snapshots can't drift from the app.
 */
function mockDataLayer() {
  return {
    name: "mock-data-layer",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer) return null;
      if (source === "@real-coachdata") return REAL_DATA;
      if (importer.includes(`${"/"}snapshots${"/"}`)) return null;
      if (source.endsWith("lib/coachData")) return MOCK_DATA;
      if (source.endsWith("lib/supabase")) return REAL_SUPABASE;
      return null;
    },
  };
}

export default defineConfig({
  root: "snapshots",
  plugins: [mockDataLayer(), react(), tailwindcss()],
  build: {
    outDir: "../snapshot-dist",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
  },
});
