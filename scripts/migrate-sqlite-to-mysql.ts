import { installTriggers, removeTriggersForEmptyImport } from "./db-triggers";
import "./db-env";
import Sqlite from "better-sqlite3";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getDatabase, closeDatabase } from "../src/server/db/mysql";
import { initializeMySql } from "./db-init";
import { validateObjectKey } from "../src/server/storage/objectKey";

type Column = { name: string; type: string; pk: number };
type SourceTable = { name: string; columns: Column[]; foreignKeys: { table: string; from: string; to: string }[] };
const quote = (name: string) => "`" + name.replaceAll("`", "``") + "`";
function timestamp(value: unknown, column: Column) {
  if (column.name === "date_of_birth" && value !== null) {
    const text = String(value).trim();
    let year:number, month:number, day:number;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text);
    const excel = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(text);
    if (iso) { year=Number(iso[1]);month=Number(iso[2]);day=Number(iso[3]); }
    else if (local) {year=Number(local[3]);month=Number(local[2]);day=Number(local[1]);}
    else if (excel) {year=(Number(excel[3])<=29?2000:1900)+Number(excel[3]);month=Number(excel[1]);day=Number(excel[2]);}
    else throw new Error("Unrecognized legacy birth date format");
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error("Invalid legacy birth date");
    return date.toISOString().slice(0,10);
  }
  if (value === null || column.type !== "TEXT" || !(/_at$/.test(column.name) || ["deadline", "v1_deadline"].includes(column.name))) return value;
  const text = String(value);
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : text.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp in ${column.name}: ${text}`);
  return date.toISOString();
}
async function migrate() {
  const sourceArg = process.argv.find(arg => arg.startsWith("--source="));
  const sourcePath = sourceArg?.slice(9) || "data/merit-track.sqlite";
  const sqlite = new Sqlite(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const violations = sqlite.pragma("foreign_key_check") as unknown[];
    if (violations.length) throw new Error(`Source has ${violations.length} foreign-key violations; repair explicitly before migration.`);
    await initializeMySql(false);
    const db = getDatabase();
    const plan = JSON.parse(await readFile("database/mysql/source-tables.json", "utf8")) as SourceTable[];
    const actual = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[];
    const missing = actual.filter(t => !plan.some(p => p.name === t.name));
    if (missing.length) throw new Error(`Unplanned source tables: ${missing.map(t => t.name).join(", ")}`);
    const report: { table: string; source: number; target: number; checksum: string }[] = [];
    for (const table of plan) {
      const count = await db.first<{count:number}>(`SELECT COUNT(*) count FROM ${quote(table.name)}`);
      if (Number(count?.count)) throw new Error(`Target table ${table.name} is not empty; refusing to overwrite data.`);
    }
    await removeTriggersForEmptyImport();
    try { await db.withTransaction(async () => {
      for (const table of plan) {
        const target = await db.first<{count: number}>(`SELECT COUNT(*) count FROM ${quote(table.name)}`);
        if (Number(target?.count)) throw new Error(`Target table ${table.name} is not empty. Migration refuses to overwrite or duplicate data. Use a fresh development database; no data has been deleted.`);
      }
      for (const table of plan) {
        let rows = sqlite.prepare(`SELECT * FROM "${table.name}"`).all() as Record<string, unknown>[];
        const sourceCount = rows.length;
        // Self-referencing categories must insert parent rows first, regardless of ID order.
        const self = table.foreignKeys.find(f => f.table === table.name);
        if (self) {
          const ordered: Record<string, unknown>[] = [], seen = new Set<unknown>();
          while (rows.length) {
            const ready = rows.filter(row => row[self.from] === null || seen.has(row[self.from]));
            if (!ready.length) throw new Error(`Unresolvable self-reference in ${table.name}`);
            for (const row of ready) { ordered.push(row); seen.add(row[self.to]); }
            rows = rows.filter(row => !ready.includes(row));
          }
          rows = ordered;
        }
        const checksum = createHash("sha256");
        for (const [index, source] of rows.entries()) {
          try {
            const row: Record<string, unknown> = {};
            for (const column of table.columns) row[column.name] = timestamp(source[column.name], column);
            if (table.name === "submission_files") {
              const legacy = String(source.file_path);
              const name = legacy.split(/[\\/]/).pop();
              if (!name || name === "." || name === "..") throw new Error("Invalid legacy evidence path");
              row.original_name = source.file_name;
              row.object_key = validateObjectKey("submissions/legacy/" + name);
              row.file_path = null;
              row.storage_provider = "local"; row.status = "ready";
              row.created_at = row.uploaded_at;
              row.uploaded_by = (sqlite.prepare("SELECT user_id FROM submissions WHERE id=?").get(source.submission_id) as {user_id: number}).user_id;
            }
            const columns = Object.keys(row);
            await db.execute(`INSERT INTO ${quote(table.name)} (${columns.map(quote).join(",")}) VALUES (${columns.map(() => "?").join(",")})`, columns.map(column => row[column]));
            checksum.update(JSON.stringify(row));
          } catch (error) {
            throw new Error(`Migration failed at table=${table.name}, row=${index + 1}, id=${String(source.id ?? "composite")}: ${error instanceof Error ? error.message : "unknown failure"}`, { cause: error });
          }
        }
        const target = await db.first<{count: number}>(`SELECT COUNT(*) count FROM ${quote(table.name)}`);
        if (Number(target?.count) !== sourceCount) throw new Error(`Row count mismatch: ${table.name}`);
        report.push({table: table.name, source: sourceCount, target: Number(target!.count), checksum: checksum.digest("hex")});
        console.log(`${table.name}: ${sourceCount} → ${target!.count}`);
      }
    });
    } finally { await installTriggers(); }
    await mkdir("tmp/migration-reports", {recursive:true});
    await writeFile(`tmp/migration-reports/sqlite-to-mysql-${Date.now()}.json`, JSON.stringify({completedAt:new Date().toISOString(), tables: report}, null, 2));
    console.log("Migration committed. SQLite and original evidence were not modified. Run the private-file migration before starting the app.");
  } finally { sqlite.close(); }
}
migrate().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(closeDatabase);
