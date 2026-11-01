import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("MySQL baseline preserves the complete table manifest and foreign keys",()=>{
  const sql=readFileSync("database/mysql/schema.sql","utf8");
  const tables=JSON.parse(readFileSync("database/mysql/source-tables.json","utf8")) as {name:string;foreignKeys:unknown[]}[];
  for(const table of tables)assert(sql.includes("CREATE TABLE IF NOT EXISTS `"+table.name+"`"),table.name);
  assert.equal(tables.length,49);assert(sql.includes("needs_revision_v2"));
  assert(sql.includes("UNIQUE KEY uq_one_active_term"));assert(sql.includes("email_outbox"));
  assert(sql.includes("submission_ready_files"));assert(!/foreign_key_checks\s*=\s*0/i.test(sql));
  const fkCount=(sql.match(/FOREIGN KEY/gi)||[]).length;
  assert(fkCount>=tables.reduce((count,table)=>count+table.foreignKeys.length,0));
});
test("all 15 original integrity and context trigger policies have MySQL equivalents",()=>{
  const sql=readFileSync("database/mysql/triggers.sql","utf8");
  assert.equal((sql.match(/CREATE TRIGGER/g)||[]).length,15);
  for(const rule of ["CLASS_COHORT_IMMUTABLE","CLASS_USER_COHORT_MISMATCH","USER_COHORT_IMMUTABLE","REASONED_ADMIN_AUDIT_REQUIRED","ACTIVITY_REGISTRATION_CAPACITY_REACHED"])assert(sql.includes(rule));
  assert(sql.includes("FOR UPDATE"));assert(sql.includes("NEW.role_context"));
});
