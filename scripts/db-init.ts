import { installTriggers } from "./db-triggers";
import "./db-env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";

export async function initializeMySql(installPolicies = true) {
  const db = getDatabase();
  await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(64) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB`);
  const sql = await readFile("database/mysql/schema.sql", "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const current = await db.first<{checksum: string}>("SELECT checksum FROM schema_migrations WHERE version='001_mysql_baseline'");
  if (current) {
    if (current.checksum !== checksum) throw new Error("Baseline changed after initialization. Add a versioned migration; do not silently modify an existing database.");
    if (installPolicies) await installTriggers();
    console.log("MySQL baseline already applied.");
    return;
  }
  for (const statement of sql.split(/^-- @statement\s*$/m).slice(1).map(part => part.trim()).filter(Boolean)) {
    await db.execute(statement.replace(/;\s*$/, ""));
  }
  await db.execute("INSERT INTO schema_migrations(version,checksum) VALUES('001_mysql_baseline',?)", [checksum]);
  if (installPolicies) await installTriggers();
  console.log("Applied MySQL baseline with foreign keys and strict mode intact.");
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/db-init.ts")) {
  initializeMySql(true).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(closeDatabase);
}
