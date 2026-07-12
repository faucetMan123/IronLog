// jeep-sqlite (the browser/WASM fallback for @capacitor-community/sqlite)
// needs sql.js's sql-wasm.wasm served from a fetchable path — see
// src/database/db.ts (wasmPath="./assets"). Rather than committing that
// ~650KB binary to git, copy it from node_modules into public/assets on
// install, so it's always the version matching the installed sql.js and
// public/ stays free of vendored build artifacts.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const destDir = join(__dirname, "..", "public", "assets");
const dest = join(destDir, "sql-wasm.wasm");

if (!existsSync(src)) {
  console.warn("[copy-sqlite-wasm] sql.js wasm not found at", src, "- skipping (run `npm install` first)");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("[copy-sqlite-wasm] copied sql-wasm.wasm to public/assets/");
