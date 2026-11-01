import { readFile } from "node:fs/promises";
import { getDatabase } from "../src/server/db/mysql";
export async function triggerStatements() {
  return (await readFile("database/mysql/triggers.sql","utf8")).split(/^-- @statement\s*$/m).slice(1).map(sql=>sql.trim().replace(/;\s*$/,""));
}
export async function installTriggers() {
  const db=getDatabase();
  for(const sql of await triggerStatements()) {
    const name=/CREATE TRIGGER (\w+)/.exec(sql)?.[1];
    if(!name)throw new Error("Invalid trigger migration.");
    await db.execute(`DROP TRIGGER IF EXISTS \`${name}\``);
    await db.execute(sql);
  }
}
export async function removeTriggersForEmptyImport() {
  const db=getDatabase();
  for(const sql of await triggerStatements()) {
    const name=/CREATE TRIGGER (\w+)/.exec(sql)?.[1];
    if(!name)throw new Error("Invalid trigger migration.");
    await db.execute(`DROP TRIGGER IF EXISTS \`${name}\``);
  }
}
