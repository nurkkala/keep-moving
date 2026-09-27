import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // The classic two. The plugin's recommended set now adds the React
      // Compiler's rules, which flag patterns used across every screen; adopting
      // them is its own decision (roadmap OPEN-29-compiler-lint).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      // JSX references don't count as uses without eslint-plugin-react, so a
      // component imported only to render reads as unused. Capitalized names
      // are components; ignore those rather than add a plugin for one rule.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js", "vite.config.js", "**/*.test.js"],
    languageOptions: { globals: globals.node },
  },
];
