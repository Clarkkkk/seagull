import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@acme/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function ensurePgCryptoCompat(client: PGlite) {
  // Drizzle migrations default to gen_random_uuid() for uuid primary keys.
  // PGlite doesn't ship with pgcrypto, so we polyfill it with a deterministic SQL function.
  await client.exec(`
    CREATE OR REPLACE FUNCTION gen_random_uuid()
    RETURNS uuid
    AS $$
      SELECT (md5(random()::text || clock_timestamp()::text))::uuid
    $$ LANGUAGE sql;
  `);
}

async function applyDrizzleMigrations(client: PGlite) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // test-integration/src/db -> (..1) src -> (..2) test-integration -> (..3) packages -> db/drizzle
  const migrationsDir = path.resolve(__dirname, "../../../db/drizzle");

  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    // drizzle-kit uses a numeric prefix; lexicographic sort is ok here.
    .sort((a, b) => a.localeCompare(b));

  for (const file of sqlFiles) {
    const full = path.join(migrationsDir, file);
    const content = await fs.readFile(full, "utf8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await client.exec(stmt);
    }
  }
}

async function resetDb(client: PGlite) {
  await client.exec(`
    TRUNCATE TABLE
      "account",
      "post",
      "session",
      "trip_collaborator",
      "trip_day",
      "trip_edit_lock",
      "trip_item",
      "trip_snapshot",
      "verification",
      "wishlist_jar_trip",
      "wishlist_jar",
      "trip",
      "user"
    CASCADE;
  `);
}

export async function createPgliteTestDb() {
  const client = new PGlite();

  // Passing schema is important to enable `db.query.*` relational API used by lock-service.
  const db = drizzle({ client, schema, casing: "snake_case" });

  await ensurePgCryptoCompat(client);
  await applyDrizzleMigrations(client);
  await resetDb(client);

  return {
    client,
    db,
    ensureSchema: async () => {
      await ensurePgCryptoCompat(client);
      await applyDrizzleMigrations(client);
    },
    resetDb: async () => resetDb(client),
  };
}

