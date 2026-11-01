require('./helpers/mysql-fixture.cjs');
const fs = require('fs'), ts = require('typescript'), Module = require('module'), Database = require('better-sqlite3'), assert = require('node:assert/strict');
function load(file, mocks = {}) {
  const m = new Module(file, module); m.paths = module.paths;
  const req = m.require.bind(m); m.require = id => Object.hasOwn(mocks, id) ? mocks[id] : req(id);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file); return m.exports;
}
const db = new Database(':memory:');
db.exec(`CREATE TABLE events(id INTEGER,status TEXT,start_at TEXT,end_at TEXT,allow_late INTEGER);
CREATE TABLE submissions(id INTEGER,event_id INTEGER,user_id INTEGER,status TEXT,review_round INTEGER,submitted_at TEXT,updated_at TEXT);
CREATE TABLE event_criteria_groups(event_id INTEGER,code TEXT,title TEXT,min_required INTEGER,sort_order INTEGER);
CREATE TABLE event_criteria_items(id INTEGER,event_id INTEGER,code TEXT,title TEXT,group_code TEXT,is_required INTEGER,sort_order INTEGER);
CREATE TABLE submission_files(submission_id INTEGER,criteria_code TEXT);
CREATE TABLE submission_items(submission_id INTEGER,criteria_code TEXT,content_text TEXT);
CREATE TABLE submission_auto_results(submission_id INTEGER,criteria_code TEXT,passed INTEGER);
CREATE TABLE submission_criteria_reviews(submission_id INTEGER,criteria_code TEXT,round INTEGER,decision TEXT);
CREATE TABLE submission_timeline(submission_id INTEGER,actor_user_id INTEGER,action TEXT,from_status TEXT,to_status TEXT,message TEXT,created_at TEXT);
INSERT INTO events VALUES(1,'published','2020-01-01','2099-01-01',0);
INSERT INTO submissions VALUES(1,1,10,'draft',1,NULL,NULL);
INSERT INTO event_criteria_groups VALUES(1,'A','Group',2,1);
INSERT INTO event_criteria_items VALUES(1,1,'A1','Required','A',1,1),(2,1,'A2','Optional','A',0,2);
INSERT INTO submission_items VALUES(1,'A1','Description without attachment'),(1,'A2','Another note');`);
db.exec("ALTER TABLE events ADD COLUMN type TEXT DEFAULT 'student'");
const requirements = load('src/server/submissions/evaluateSubmissionRequirements.ts');
const phase = load('src/lib/events/eventSubmissionPhase.ts');
const action = load('src/server/actions/submissions/submitStudentSubmission.ts', {
  'next/cache': { revalidatePath() {} }, '@/server/auth/guards': { requireStudentContext: async () => ({id:10}) },
  '@/server/db/mysql': { getDatabase: () => db }, '@/lib/events/eventSubmissionPhase': phase,
  '@/server/events/evaluateSubmissionAuto': { evaluateSubmissionAuto() {} },
  '@/server/submissions/evaluateSubmissionRequirements': requirements,
}).submitStudentSubmission;
(async () => {
  let result = await action(1); assert.equal(result.ok,false); assert.equal(result.missingCriteria[0].code,'A1');
  assert.equal(db.prepare('SELECT status FROM submissions').get().status,'draft');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM submission_timeline').get().n,0);
  db.exec("INSERT INTO submission_files VALUES(1,'A2')");
  result=await action(1); assert.equal(result.ok,false); assert.equal(result.missingCriteria[0].code,'A1');
  db.exec("INSERT INTO submission_auto_results VALUES(1,'A1',1)");
  result=await action(1); assert.equal(result.ok,true); assert.equal(db.prepare('SELECT status FROM submissions').get().status,'submitted_v1');
  db.exec("UPDATE submissions SET status='needs_revision_v2',review_round=2; DELETE FROM submission_auto_results;");
  result=await action(1); assert.equal(result.ok,false); assert.equal(db.prepare('SELECT status FROM submissions').get().status,'needs_revision_v2');
  db.exec("INSERT INTO submission_files VALUES(1,'A1')"); result=await action(1); assert.equal(result.ok,true);
  assert.equal(db.prepare('SELECT status FROM submissions').get().status,'submitted_v2'); db.close();
  console.log('Passed: notes cannot replace attachments, required criterion and group minimum enforced, auto achievement exempted, missing evidence never submits, resubmission validated.');
})().catch(error => { console.error(error); process.exitCode=1; });
