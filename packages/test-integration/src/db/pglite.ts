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

async function applyTestSchemaSql(client: PGlite) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaSqlPath = path.resolve(__dirname, "./schema.sql");
  const content = await fs.readFile(schemaSqlPath, "utf8").catch(() => null);
  if (!content?.trim()) {
    throw new Error(
      `[test-db] Missing schema.sql. Run: pnpm -F @acme/test-integration db:schema`,
    );
  }

  const statements = content
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  // drizzle-kit generated SQL usually includes explicit breakpoints.
  // As a fallback, if there is only one "statement", execute it as-is.
  for (const stmt of statements.length ? statements : [content]) {
    await client.exec(stmt);
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
  await applyTestSchemaSql(client);
  await resetDb(client);

  return {
    client,
    db,
    ensureSchema: async () => {
      await ensurePgCryptoCompat(client);
      await applyTestSchemaSql(client);
    },
    resetDb: async () => resetDb(client),
  };
}

