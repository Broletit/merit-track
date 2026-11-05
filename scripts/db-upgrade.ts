import "./db-env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";

async function run() {
  const db = getDatabase();
  await db.execute("CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(64) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB");
  const migrations = ["002_report_assessment_cache", "003_user_role_assignments"];
  let appliedCount = 0;
  for (const version of migrations) {
    const sql = await readFile(`database/mysql/migrations/${version}.sql`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await db.first<{ version: string }>("SELECT version FROM schema_migrations WHERE version=?", [version]);
    if (applied) continue;
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean)) await db.execute(statement);
    await db.execute("INSERT INTO schema_migrations(version,checksum) VALUES(?,?)", [version, checksum]);
    appliedCount++;
  }
  console.log(appliedCount ? `Applied ${appliedCount} database migration(s).` : "Database is up to date.");
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
