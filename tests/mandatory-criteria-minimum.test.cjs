require('./helpers/mysql-fixture.cjs');
const fs = require('fs'), ts = require('typescript'), Module = require('module'), Database = require('better-sqlite3'), assert = require('node:assert/strict');
function load(file, mocks = {}) {
  const m = new Module(file, module); m.paths = module.paths;
  const req = m.require.bind(m); m.require = id => Object.hasOwn(mocks, id) ? mocks[id] : req(id);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file); return m.exports;
}

(async()=>{
const db=new Database(':memory:');
db.exec("CREATE TABLE criteria_templates(id INTEGER,for_type TEXT); INSERT INTO criteria_templates VALUES(1,'student'); CREATE TABLE criteria_template_groups(id INTEGER,template_id INTEGER,code TEXT,title TEXT,description TEXT,min_required INTEGER,score_max REAL); INSERT INTO criteria_template_groups VALUES(1,1,'A','A',NULL,1,0); CREATE TABLE criteria_template_items(template_id INTEGER,group_code TEXT,code TEXT,is_required INTEGER); INSERT INTO criteria_template_items VALUES(1,'A','A1',1),(1,'A','A2',1),(1,'A','A3',1);");
const helper=load('src/server/criteria-templates/groupRequirements.ts');
helper.syncGroupMinimum(db,1);assert.equal(db.prepare('SELECT min_required FROM criteria_template_groups').get().min_required,3);
const update=load('src/server/actions/criteria-templates/updateCriteriaGroup.ts',{
 "next/cache":{revalidatePath(){}},
 "@/server/auth/guards":{requireAdminContext:async()=>({id:1})},
 "@/server/db/mysql":{getDatabase:()=>db},
 "@/server/criteria-templates/assertCriteriaTemplateMutable":{assertCriteriaTemplateMutable(){}}
}).updateCriteriaGroup;
const form=new FormData();form.set('title','A');
for(const min of [1,2,1.5,4]){form.set('minRequired',String(min));await assert.rejects(update(1,'A',form));}
form.set('minRequired','3');await update(1,'A',form);helper.assertTemplateReady(db,1);
db.exec("DELETE FROM criteria_template_items WHERE code='A3'");helper.syncGroupMinimum(db,1,undefined,true);assert.equal(db.prepare('SELECT min_required FROM criteria_template_groups').get().min_required,2);
db.exec("UPDATE criteria_template_groups SET min_required=3");assert.throws(()=>helper.assertTemplateReady(db,1));
db.exec("DELETE FROM criteria_template_items");assert.throws(()=>helper.assertTemplateReady(db,1));
db.exec("CREATE TABLE submissions(id INTEGER,event_id INTEGER,review_round INTEGER); INSERT INTO submissions VALUES(1,1,1); CREATE TABLE event_criteria_groups(event_id INTEGER,code TEXT,title TEXT,min_required INTEGER,sort_order INTEGER); INSERT INTO event_criteria_groups VALUES(1,'A','A',2,1); CREATE TABLE event_criteria_items(id INTEGER,event_id INTEGER,code TEXT,title TEXT,group_code TEXT,is_required INTEGER,sort_order INTEGER); INSERT INTO event_criteria_items VALUES(1,1,'A1','Mandatory','A',1,1),(2,1,'A2','Optional','A',0,2),(3,1,'A3','Optional','A',0,3); CREATE TABLE submission_files(submission_id INTEGER,criteria_code TEXT); INSERT INTO submission_files VALUES(1,'A2'),(1,'A3'); CREATE TABLE submission_items(submission_id INTEGER,criteria_code TEXT,content_text TEXT); CREATE TABLE submission_auto_results(submission_id INTEGER,criteria_code TEXT,passed INTEGER); CREATE TABLE submission_criteria_reviews(submission_id INTEGER,criteria_code TEXT,round INTEGER,decision TEXT);");
const evaluate=load('src/server/submissions/evaluateSubmissionRequirements.ts').evaluateSubmissionRequirements;
let result=evaluate(db,1);assert.equal(result.valid,false);assert.equal(result.groupResults[0].passed,false);assert.equal(result.groupResults[0].achieved,2);assert.equal(result.missingCriteria[0].code,'A1');
db.exec("INSERT INTO submission_files VALUES(1,'A1')");assert.equal(evaluate(db,1).valid,true);
assert.equal(evaluate(db,1,'approved').valid,false,'Evidence alone is not an approval');
db.exec("INSERT INTO submission_criteria_reviews VALUES(1,'A1',1,'pass'),(1,'A2',1,'pass')");assert.equal(evaluate(db,1,'approved').valid,true);
db.exec("UPDATE event_criteria_items SET is_required=1; UPDATE event_criteria_groups SET min_required=1");result=evaluate(db,1,'approved');assert.equal(result.groupResults[0].required,3);assert.equal(result.valid,false);
db.exec("INSERT INTO submission_auto_results VALUES(1,'A3',1)");assert.equal(evaluate(db,1,'approved').valid,true);
db.exec("INSERT INTO submission_criteria_reviews VALUES(1,'A3',1,'fail')");assert.equal(evaluate(db,1,'approved').valid,false,'Explicit review rejection overrides automatic achievement');
db.close();console.log('Passed: mandatory floor, integer bounds, server update rejection, deletion clamp, publish readiness, required AND count, approved evidence, legacy threshold, reviewer rejection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
