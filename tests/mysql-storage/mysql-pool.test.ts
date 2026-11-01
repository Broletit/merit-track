import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { Database } from "../../src/server/db/mysql";

test("transactions use one connection, await writes, and rollback/release on failure",async()=>{
  const calls:string[]=[], raw={}, db=new Database();
  let checkouts=0;
  const connection={connection:raw,query:async(sql:string)=>{calls.push(sql);return sql.startsWith("SELECT")?[[{id:1}],[]]:[{affectedRows:1,insertId:42},[]];},beginTransaction:async()=>{calls.push("BEGIN");},commit:async()=>{calls.push("COMMIT");},rollback:async()=>{calls.push("ROLLBACK");},release:()=>{calls.push("RELEASE");}};
  const state=globalThis as typeof globalThis & {meritTrackPool?:Pool}, previous=state.meritTrackPool;
  state.meritTrackPool={getConnection:async()=>{checkouts++;return connection;}} as unknown as Pool;
  try {
    await db.withTransaction(async()=>{assert.equal((await db.execute("UPDATE one SET value=?",[1])).insertId,42);await db.first("SELECT id FROM one");});
    assert.equal(checkouts,1);assert.equal(calls.at(-2),"COMMIT");assert.equal(calls.at(-1),"RELEASE");
    assert(calls.some(sql=>sql.includes("ONLY_FULL_GROUP_BY")));assert(calls.some(sql=>sql.includes("FOR UPDATE")));
    calls.length=0;
    await assert.rejects(db.withTransaction(async()=>{await db.execute("UPDATE one SET value=?",[2]);throw new Error("late failure");}),/late failure/);
    assert.equal(calls.filter(sql=>sql==="ROLLBACK").length,1);assert(!calls.includes("COMMIT"));assert.equal(calls.at(-1),"RELEASE");
    calls.length=0;
    await db.withTransaction(async()=>{await assert.rejects(db.withTransaction(async()=>{throw new Error("nested failure");}));await db.execute("UPDATE one SET value=?",[3]);});
    assert(calls.some(sql=>sql.startsWith("SAVEPOINT ")));assert(calls.some(sql=>sql.startsWith("ROLLBACK TO SAVEPOINT ")));assert(calls.includes("COMMIT"));
    await assert.rejects(db.execute("SELECT ?",[{}]),/parameter/);await assert.rejects(db.execute("SELECT ?",[NaN]),/finite/);
  } finally {if(previous)state.meritTrackPool=previous;else delete state.meritTrackPool;}
});
