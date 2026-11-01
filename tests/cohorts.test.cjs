require('./helpers/mysql-fixture.cjs');
﻿const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),Database=require('better-sqlite3'),assert=require('node:assert/strict');
const root=process.cwd();
function loader(mocks={}) {
 const cache=new Map();
 function load(rel) {
  const full=path.resolve(root,rel); if(cache.has(full))return cache.get(full).exports;
  const m=new Module(full,module);m.filename=full;m.paths=Module._nodeModulePaths(path.dirname(full));cache.set(full,m);
  const original=m.require.bind(m);
  m.require=id=> {
   if(Object.hasOwn(mocks,id))return mocks[id];
   if(id.startsWith('@/components/'))return {__esModule:true,default:()=>null};
   let target=id.startsWith('@/')?path.join(root,'src',id.slice(2)):id.startsWith('.')?path.resolve(path.dirname(full),id):null;
   if(target){for(const ext of ['','.ts','.tsx','/index.ts'])if(fs.existsSync(target+ext)&&fs.statSync(target+ext).isFile())return load(target+ext);}
   return original(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,full);return m.exports;
 }
 return load;
}
const core=loader();const {migrateCohorts}=core('src/server/cohorts/migrateCohorts.ts'),sql=core('src/server/cohorts/sql.ts'),cohorts=core('src/lib/cohorts/cohorts.ts');
const fixture=new Database(':memory:');fixture.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,mssv TEXT,role TEXT);CREATE TABLE classes(id INTEGER PRIMARY KEY,code TEXT,is_active INTEGER DEFAULT 1);CREATE TABLE class_members(class_id INTEGER,user_id INTEGER,left_at TEXT);CREATE TABLE activities(id INTEGER PRIMARY KEY,organizer_level TEXT);CREATE TABLE activity_scopes(activity_id INTEGER,class_id INTEGER,UNIQUE(activity_id,class_id));CREATE TABLE event_scopes(event_id INTEGER,class_id INTEGER);INSERT INTO classes(id,code) VALUES(1,'A'),(2,'B'),(3,'C');INSERT INTO users VALUES(1,'21000001','student'),(2,'22000002','student'),(3,'23000003','class_officer'),(4,'25000004','student'),(5,'STAFF','faculty_officer');INSERT INTO class_members VALUES(1,1,NULL),(2,2,NULL),(3,3,NULL),(3,4,NULL);INSERT INTO activities VALUES(1,'class'),(2,'class'),(3,'faculty'),(4,'class');`);
migrateCohorts(fixture);migrateCohorts(fixture);
assert.deepEqual(fixture.prepare('SELECT cohort FROM users ORDER BY id').all().map(r=>r.cohort),[17,18,19,21,null]);assert.equal(fixture.prepare('SELECT cohort FROM classes WHERE id=1').get().cohort,17);assert.equal(fixture.prepare('SELECT cohort FROM classes WHERE id=3').get().cohort,null);
const scopes=loader({'@/server/db/mysql':{getDatabase:()=>fixture}})('src/server/activities/scopes.ts');
scopes.saveActivityScopes(1,[1,2],[]);scopes.saveActivityScopes(2,[],[18,19]);
const visible=(activityId,userId)=>Boolean(fixture.prepare(`SELECT 1 FROM activities a WHERE a.id=? AND ${sql.activityVisibleSql('a',String(userId))}`).get(activityId));
assert(visible(1,1));assert(visible(1,2));assert(!visible(1,3));assert(visible(2,2));assert(visible(2,3));assert(!visible(2,4));assert(visible(3,4));assert(!visible(4,1));assert.throws(()=>scopes.assertActivityScope(2,4));
fixture.prepare("INSERT INTO users VALUES(6,'22000006','student',NULL)").run();assert(visible(2,6));
assert.equal(cohorts.cohortFromMssv('25000001'),21);assert.equal(cohorts.cohortFromMssv('251'),null);assert.throws(()=>cohorts.assertImportCohort(18,[{mssv:'25000001'}]));assert.equal(cohorts.assertImportCohort(21,[{mssv:'25000001'}]),21);
const old=new Database(':memory:');
old.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,mssv TEXT,role TEXT,cohort INTEGER CHECK(cohort IS NULL OR cohort BETWEEN 17 AND 21));CREATE TABLE classes(id INTEGER PRIMARY KEY,cohort INTEGER CHECK(cohort IS NULL OR cohort BETWEEN 17 AND 21));CREATE TABLE class_members(class_id INTEGER,user_id INTEGER,left_at TEXT);CREATE TABLE activities(id INTEGER PRIMARY KEY);CREATE TABLE activity_cohort_scopes(activity_id INTEGER,cohort INTEGER CHECK(cohort BETWEEN 17 AND 21),PRIMARY KEY(activity_id,cohort));`);
migrateCohorts(old);migrateCohorts(old);
old.prepare("INSERT INTO users VALUES(1,'26000001','student',NULL)").run();
assert.equal(old.prepare('SELECT cohort FROM users').get().cohort,22);
old.exec('INSERT INTO classes VALUES(1,22); INSERT INTO activity_cohort_scopes VALUES(1,22); INSERT INTO cohorts VALUES(22)');
assert.equal(old.pragma('integrity_check',{simple:true}),'ok');
assert.equal(cohorts.assertImportCohort(22,[{mssv:'26000001'}]),22);
old.close();
const form=new FormData();form.append('classIds','1');form.append('classIds','2');form.append('cohorts','18');assert.deepEqual(scopes.readActivityScopes(form),{classIds:[1,2],cohorts:[18]});form.append('cohorts','100');assert.throws(()=>scopes.readActivityScopes(form));
let w=[],v=[];sql.addCohortFilter(w,v,'18','u.cohort');assert.equal(fixture.prepare(`SELECT COUNT(*) n FROM users u WHERE ${w.join(' AND ')}`).get(...v).n,2);
console.log('Passed: legacy backfill, idempotency, mixed classes, multi-class/cohort visibility, late imports, out-of-scope rejection and invalid cohort checks.');fixture.close();
