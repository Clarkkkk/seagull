import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testIntegrationDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(testIntegrationDir, "../..");
const dbPackageDir = path.resolve(repoRoot, "packages/db");
const outFile = path.resolve(testIntegrationDir, "src/db/schema.sql");
const tmpOutDir = path.resolve(testIntegrationDir, "src/db/.drizzle-schema-tmp");

async function rmrf(p) {
  await fs.rm(p, { recursive: true, force: true }).catch(() => undefined);
}

async function main() {
  await rmrf(tmpOutDir);
  await fs.mkdir(tmpOutDir, { recursive: true });

  // drizzle.config.ts currently requires DATABASE_URL even for offline generation.
  // We provide a dummy value so drizzle-kit can load config if it wants to.
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/db",
  };

  // Generate an "init-like" migration into a temp folder, then persist it as schema.sql for PGlite.
  // We intentionally keep this out of packages/db/drizzle/ to avoid touching real migrations.
  await execFileAsync(
    "pnpm",
    [
      "-C",
      dbPackageDir,
      "exec",
      "drizzle-kit",
      "generate",
      "--dialect",
      "postgresql",
      "--schema",
      "./src/schema.ts",
      "--casing",
      "snake_case",
      "--out",
      tmpOutDir,
      "--name",
      "test_schema",
    ],
    { env },
  );

  const entries = await fs.readdir(tmpOutDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  if (!sqlFiles.length) {
    throw new Error(`[db:schema] No .sql file generated in ${tmpOutDir}`);
  }

  const sql = await fs.readFile(path.join(tmpOutDir, sqlFiles[0]), "utf8");
  const header = `-- GENERATED FILE (do not hand-edit)\n-- Source: packages/db/src/schema.ts\n-- Generated at: ${new Date().toISOString()}\n\n`;
  await fs.writeFile(outFile, header + sql, "utf8");

  await rmrf(tmpOutDir);
}

await main();

