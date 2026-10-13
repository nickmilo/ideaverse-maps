import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores, defineConfig } from "eslint/config";

export default defineConfig(
  globalIgnores(["node_modules", "dist", "esbuild.config.mjs", "eslint.config.mjs", "versions.json", "main.js", "package.json", "package-lock.json"]),
  { languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser } } },
  ...obsidianmd.configs.recommended,
);
