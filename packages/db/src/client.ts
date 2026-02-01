import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Database connection string is missing. Set DATABASE_URL.",
  );
}

const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});

export type Db = typeof db;
