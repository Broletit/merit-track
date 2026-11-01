require('./helpers/mysql-fixture.cjs');
const fs = require('fs'), ts = require('typescript'), Module = require('module'), assert = require('assert/strict'), Database = require('better-sqlite3');
function load(file, mocks = {}) {
  const mod = new Module(file, module); mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText, file);
  return mod.exports;
}
const cohorts = load('src/lib/cohorts/cohorts.ts');
const {cohortClause} = load('src/server/cohorts/sql.ts', {'@/lib/cohorts/cohorts':cohorts});
const db = new Database(':memory:');
db.exec("CREATE TABLE classes(id INTEGER, code TEXT, cohort INTEGER, is_active INTEGER); CREATE TABLE assignments(officer INTEGER,class_id INTEGER); INSERT INTO classes VALUES(1,'A17',17,1),(2,'B18',18,1),(3,'C18',18,0),(4,'D19',19,1); INSERT INTO assignments VALUES(5,1),(5,2);");
const options = cohort => db.prepare('SELECT code FROM classes WHERE is_active=1 AND '+cohortClause(cohort,'cohort')+' ORDER BY code').all().map(item=>item.code);
assert.deepEqual(options('18'),['B18']); assert.deepEqual(options('20'),[]); assert.deepEqual(options(''),['A17','B18','D19']); assert.deepEqual(options('18 OR 1=1'),[]);
const scoped = db.prepare('SELECT c.code FROM classes c JOIN assignments a ON a.class_id=c.id WHERE a.officer=? AND '+cohortClause('19','c.cohort')).all(5); assert.deepEqual(scoped,[]);
let destination, navigation;
let params = new URLSearchParams('cohort=17&classId=1&class=A17&classCode=A17&page=3&potentialPage=2&keyword=An&status=passed');
const component = load('src/components/shared/CohortFilter.tsx', {
  'next/navigation':{usePathname:()=>'/dashboard/admin/submissions',useRouter:()=>({replace:(url,options)=>{destination=url;navigation=options;}}),useSearchParams:()=>params},
  '@/components/shared/useCohorts':()=>({cohorts:[17,18,19,20]})
}).default;
component().props.onChange({target:{value:'18'}});
const next=new URL(destination,'http://localhost').searchParams;
assert.equal(next.get('cohort'),'18');for(const key of ['classId','class','classCode','page','potentialPage'])assert.equal(next.has(key),false,key);assert.equal(next.get('keyword'),'An');assert.equal(next.get('status'),'passed');assert.equal(navigation.scroll,false);
params=next; component().props.onChange({target:{value:''}});assert.equal(new URL(destination,'http://localhost').searchParams.has('cohort'),false);
db.close();console.log('Passed: cohort-specific classes, empty/all cohorts, inactive classes excluded, officer scope preserved, stale class/page filters cleared without scrolling.');
