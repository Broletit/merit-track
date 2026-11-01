// Legacy business fixtures only. This is never imported by application code.
// Real MySQL syntax/constraints/concurrency are verified by the separate MySQL integration gate.
const Database = require('better-sqlite3');
function fixtureSql(sql) {
  const table=/information_schema\.columns[^]*table_name='(\w+)'/i.exec(sql)?.[1];
  if(table)return `PRAGMA table_info(${table})`;
  return sql.replace(/CURRENT_TIMESTAMP\(3\)/gi,"datetime('now')")
    .replace(/CAST\(([\w.]+) AS DATETIME\(3\)\)/gi,'datetime($1)')
    .replace(/\bINSERT IGNORE\b/gi,'INSERT OR IGNORE')
    .replace(/\bON DUPLICATE KEY UPDATE\b/gi,'ON CONFLICT DO UPDATE SET')
    .replace(/\bVALUES\(([A-Za-z_]\w*)\)/gi,'excluded.$1')
    .replace(/\bGREATEST\(/gi,'MAX(').replace(/\bLEAST\(/gi,'MIN(')
    .replace(/\bsubmission_ready_files\b/g,'submission_files')
    .replace(/\s+FOR UPDATE\b/gi,'');
}
Database.prototype.first=async function(sql,params=[]){return this.prepare(fixtureSql(sql)).get(...params);};
Database.prototype.rows=async function(sql,params=[]){return this.prepare(fixtureSql(sql)).all(...params);};
Database.prototype.execute=async function(sql,params=[]){const result=this.prepare(fixtureSql(sql)).run(...params);return {changes:result.changes,insertId:Number(result.lastInsertRowid)};};
let sequence=0;
Database.prototype.withTransaction=async function(operation){
  const nested=this.inTransaction,name='fixture_'+(++sequence);
  this.exec(nested?'SAVEPOINT '+name:'BEGIN IMMEDIATE');
  try{const result=await operation();this.exec(nested?'RELEASE SAVEPOINT '+name:'COMMIT');return result;}
  catch(error){this.exec(nested?'ROLLBACK TO SAVEPOINT '+name:'ROLLBACK');if(nested)this.exec('RELEASE SAVEPOINT '+name);throw error;}
};
