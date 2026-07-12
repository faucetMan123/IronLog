// Thin wrapper around @capacitor-community/sqlite. Works both on Android
// (native SQLite via the plugin's bridge) and in the browser/GitHub Pages
// build (via the jeep-sqlite web component + wasm, IndexedDB-backed) —
// same code path, same schema, same migration logic either way.
import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";
import { SCHEMA_MIGRATIONS } from "./schema";

const DB_NAME = "el_supremo";

let sqliteConn: SQLiteConnection | null = null;
let dbConn: SQLiteDBConnection | null = null;
let webStoreReady = false;

async function ensureWebStore(conn: SQLiteConnection): Promise<void> {
  if (Capacitor.getPlatform() !== "web" || webStoreReady) return;
  if (!customElements.get("jeep-sqlite")) {
    // The raw custom-element module doesn't self-register once bundled by
    // Vite; the Stencil-generated loader's defineCustomElements() is the
    // path that actually works in a production build (see
    // docs/DATA_MODEL.md for the investigation).
    const { defineCustomElements } = await import("jeep-sqlite/loader");
    defineCustomElements();
  }
  if (!document.querySelector("jeep-sqlite")) {
    const el = document.createElement("jeep-sqlite");
    // Relative path (no leading slash) so it resolves correctly whether the
    // app is served from a domain root or a GitHub Pages sub-path — see
    // public/assets/sql-wasm.wasm, copied from sql.js at install time.
    el.setAttribute("wasmPath", "./assets");
    document.body.appendChild(el);
  }
  await customElements.whenDefined("jeep-sqlite");
  await conn.initWebStore();
  webStoreReady = true;
}

async function appliedSchemaVersion(conn: SQLiteDBConnection): Promise<number> {
  try {
    const res = await conn.query("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1");
    const row = res.values?.[0] as { version?: number } | undefined;
    return row?.version ?? 0;
  } catch {
    // schema_migrations doesn't exist yet — first run.
    return 0;
  }
}

async function applySchemaMigrations(conn: SQLiteDBConnection): Promise<void> {
  const applied = await appliedSchemaVersion(conn);
  for (const migration of SCHEMA_MIGRATIONS) {
    if (migration.version <= applied) continue;
    for (const stmt of migration.statements) {
      await conn.execute(stmt);
    }
    await conn.run("INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)", [
      migration.version,
      migration.description,
      new Date().toISOString(),
    ]);
  }
}

/** Opens (creating if needed) the app's single SQLite database, applies any
 *  pending schema migrations, and returns the live connection. Safe to call
 *  repeatedly — subsequent calls return the same open connection. */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (dbConn) return dbConn;
  sqliteConn = new SQLiteConnection(CapacitorSQLite);
  await ensureWebStore(sqliteConn);

  const isConn = (await sqliteConn.isConnection(DB_NAME, false)).result;
  dbConn = isConn ? await sqliteConn.retrieveConnection(DB_NAME, false) : await sqliteConn.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await dbConn.open();
  await applySchemaMigrations(dbConn);
  return dbConn;
}

export async function closeDb(): Promise<void> {
  if (!dbConn || !sqliteConn) return;
  await sqliteConn.closeConnection(DB_NAME, false);
  dbConn = null;
}

/** Persists the in-memory (wasm) web store to IndexedDB. Required after
 *  writes on the web platform — the native Android connection persists to
 *  disk on every statement and doesn't need this. */
export async function persistWebStore(): Promise<void> {
  if (!sqliteConn || Capacitor.getPlatform() !== "web") return;
  await sqliteConn.saveToStore(DB_NAME);
}

export interface RowSpec {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Bulk-inserts rows for one table using INSERT OR IGNORE keyed by primary
 *  key `id` (or a composite natural key for join-ish tables), so re-running
 *  the same migration/seed twice never duplicates rows — the deterministic
 *  ids produced by migrateV15Data() are what make this safe. */
export async function insertOrIgnore(conn: SQLiteDBConnection, spec: RowSpec): Promise<void> {
  if (!spec.rows.length) return;
  const placeholders = `(${spec.columns.map(() => "?").join(", ")})`;
  const sql = `INSERT OR IGNORE INTO ${spec.table} (${spec.columns.join(", ")}) VALUES ${spec.rows.map(() => placeholders).join(", ")}`;
  const values = spec.rows.flatMap((row) => spec.columns.map((c) => row[c] ?? null));
  await conn.run(sql, values, true);
}

export async function getSetting(conn: SQLiteDBConnection, table: "app_settings" | "backup_metadata", key: string): Promise<string | null> {
  const res = await conn.query(`SELECT value FROM ${table} WHERE key = ?`, [key]);
  const row = res.values?.[0] as { value?: string } | undefined;
  return row?.value ?? null;
}

export async function setSetting(conn: SQLiteDBConnection, table: "app_settings" | "backup_metadata", key: string, value: string): Promise<void> {
  await conn.run(`INSERT OR REPLACE INTO ${table} (key, value) VALUES (?, ?)`, [key, value]);
}
