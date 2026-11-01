require('./helpers/mysql-fixture.cjs');
const fs=require('fs'),path=require('path'),ts=require('typescript'),Module=require('module'),Database=require('better-sqlite3'),assert=require('node:assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;}
(async()=>{
const db=new Database(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,role TEXT,is_active INTEGER);INSERT INTO users VALUES(1,'admin',1),(2,'student',1),(3,'student',1);
CREATE TABLE sessions(id TEXT PRIMARY KEY,user_id INTEGER,login_context TEXT,expires_at TEXT,revoked_at TEXT);
INSERT INTO sessions VALUES('admin',1,'admin','2099-01-01',NULL),('student',2,'student','2099-01-01',NULL),('revoked',1,'admin','2099-01-01','2026-01-01'),('expired',1,'admin','2000-01-01',NULL);
CREATE TABLE events(id INTEGER PRIMARY KEY); INSERT INTO events VALUES(1);
CREATE TABLE submissions(id INTEGER PRIMARY KEY); INSERT INTO submissions VALUES(1);
CREATE TABLE criteria_templates(id INTEGER PRIMARY KEY); INSERT INTO criteria_templates VALUES(1);
CREATE TABLE activities(id INTEGER PRIMARY KEY); INSERT INTO activities VALUES(1);
CREATE TABLE activity_public_ids(activity_id INTEGER PRIMARY KEY,token TEXT UNIQUE);
CREATE TABLE submission_files(id INTEGER PRIMARY KEY,file_path TEXT);INSERT INTO submission_files VALUES(1,'/uploads/submissions/evidence.png');
CREATE TABLE public_page_routes(internal_path TEXT PRIMARY KEY,token TEXT UNIQUE);
CREATE TABLE class_members(user_id INTEGER,class_id INTEGER,left_at TEXT);INSERT INTO class_members VALUES(4,10,NULL),(5,10,'2026-01-01');
CREATE TABLE faculty_class_assignments(faculty_officer_id INTEGER,class_id INTEGER);INSERT INTO faculty_class_assignments VALUES(6,10);`);
const pages=load('src/server/auth/publicPageRoute.ts');
const proxy=load('src/proxy.ts',{'@/server/db/mysql':{getDatabase:()=>db},'@/server/activities/publicActivityId':load('src/server/activities/publicActivityId.ts'),'@/server/auth/publicPageRoute':pages,'@/server/auth/apiRequestGuard':load('src/server/auth/apiRequestGuard.ts')}).proxy;
const {NextRequest}=require('next/server');
const request=(url,session='admin',method='GET')=>proxy(new NextRequest('http://localhost:3000'+url,{method,headers:session?{cookie:'merit_track_session='+session}:{}}));
const routes=['/dashboard/admin/events/1','/dashboard/admin/events/1/edit','/dashboard/admin/events/1/candidates','/dashboard/admin/submissions/1','/dashboard/admin/students/2','/dashboard/admin/criteria-templates/1/configure','/dashboard/admin/officer-submissions/1','/dashboard/admin/officer-reviews/1','/api/admin/activities/1/export','/api/admin/submissions/1/evaluate','/api/admin/submissions/1/decision','/api/admin/activities/1/checkin','/api/submissions/files/1'];
for(const route of routes){
  const r=request(route+'?page=2');assert.equal(r.status,307,route);
  const location=r.headers.get('location');assert.match(location,/[a-f0-9]{32}/);assert(location.endsWith('?page=2'));
  assert.equal(request(route).headers.get('location'),location.replace('?page=2',''));
  const url=new URL(location);const rewritten=request(url.pathname+url.search);assert.equal(new URL(rewritten.headers.get('x-middleware-rewrite')).pathname,route);
  assert.equal(request(route,'student').status,route.startsWith('/api/submissions/files/')?307:403);
  assert([307,401].includes(request(route,null).status));
}
for(const staticPath of ['/dashboard/admin/events/create','/dashboard/admin/criteria-templates/create','/api/admin/activities/options']) assert.equal(request(staticPath).headers.get('x-middleware-next'),'1','Static routes must remain accessible');
for(const api of ['/api/admin/users','/api/admin/classes','/api/admin/events/create','/api/admin/import-students','/api/admin/activities/options']){assert.equal(request(api,null,'POST').status,401);assert.equal(request(api,'student','POST').status,403);}
assert.equal(request('/api/cohorts','student','POST').status,403);
const studentPath='/dashboard/student/submissions/1';
const studentUrl=new URL(request(studentPath,'student').headers.get('location')).pathname;
assert.equal(new URL(request(studentUrl,'student').headers.get('x-middleware-rewrite')).pathname,studentPath);
assert.equal(request(studentUrl.replace('/student/','/admin/')).status,404,'Token cannot move to another role path');
const eventUrl=new URL(request('/dashboard/admin/events/1').headers.get('location')).pathname;
assert.equal(request(eventUrl+'/edit').status,404,'Token cannot move to another operation');
for(const bad of ['0','-1','1.2','999999999999999999999','999','not-a-token','a'.repeat(32)]) assert.equal(request('/dashboard/admin/events/'+bad).status,404);
for(const session of ['expired','revoked']) assert.equal(request('/dashboard/admin/events/1',session).headers.get('location'),'http://localhost:3000/login');
assert.equal(request('/api/admin/submissions/1/decision','student','POST').status,403);
assert.equal(request('/api/admin/submissions/1/decision','admin','POST').headers.get('x-middleware-next'),'1');
assert.equal(request('/dashboard/admin/events/1','admin','POST').headers.get('x-middleware-next'),'1');
assert.equal(new URL(request('/uploads/submissions/evidence.png','student').headers.get('x-middleware-rewrite')).pathname,'/api/submissions/files/1');
assert.equal(request('/uploads/submissions/evidence.png',null).headers.get('location'),'http://localhost:3000/login');
assert.equal(request('/uploads/submissions/unknown.png').status,404);
const access=load('src/server/auth/canReadSubmissionFile.ts').canReadSubmissionFile;
const file={user_id:2,class_id:10,submitted_at:'2026-01-01',has_support:0};
assert(access(db,{id:2,role:'student',loginContext:'student'},file));
assert(!access(db,{id:3,role:'student',loginContext:'student'},file));
assert(access(db,{id:1,role:'admin',loginContext:'admin'},file));
assert(!access(db,{id:1,role:'admin',loginContext:'student'},file));
assert(access(db,{id:4,role:'class_officer',loginContext:'class_officer'},file));
assert(!access(db,{id:5,role:'class_officer',loginContext:'class_officer'},file));
assert(access(db,{id:6,role:'faculty_officer',loginContext:'faculty_officer'},file));
assert(!access(db,{id:7,role:'faculty_officer',loginContext:'faculty_officer'},file));
assert(!access(db,{id:6,role:'faculty_officer',loginContext:'student'},file));
assert(!access(db,{id:6,role:'faculty_officer',loginContext:'faculty_officer'},{...file,submitted_at:null}));
assert(access(db,{id:6,role:'faculty_officer',loginContext:'faculty_officer'},{...file,submitted_at:null,has_support:1}));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk('src/app/dashboard').filter(p=>p.includes('[id]')&&p.endsWith('page.tsx'))){const route='/'+file.replaceAll('\\','/').replace(/^src\/app\//,'').replace('/page.tsx','').replace('[id]','1');assert(pages.detailPagePattern.test(route)||/\/(?:activities|officer-activities|users)\/1(?:\/edit)?$/.test(route),'Uncovered detail page: '+route);}

db.exec("ALTER TABLE submissions ADD COLUMN user_id INTEGER; ALTER TABLE submissions ADD COLUMN class_id INTEGER; ALTER TABLE submissions ADD COLUMN submitted_at TEXT; UPDATE submissions SET user_id=2,class_id=10,submitted_at='2026-01-01'; ALTER TABLE submission_files ADD COLUMN submission_id INTEGER; ALTER TABLE submission_files ADD COLUMN file_name TEXT; ALTER TABLE submission_files ADD COLUMN mime_type TEXT; UPDATE submission_files SET submission_id=1,file_name='evidence.png',mime_type='image/png'; CREATE TABLE submission_support_requests(submission_id INTEGER,status TEXT);");
let viewer={id:3,role:'student',loginContext:'student'},reads=0;
const handler=load('src/app/api/submissions/files/[id]/route.ts',{'@/server/db/mysql':{getDatabase:()=>db},'@/server/auth/guards':{requireLogin:async()=>viewer},'@/server/auth/canReadSubmissionFile':{canReadSubmissionFile:access},'fs/promises':{readFile:async()=>{reads++;return Buffer.from('fixture');}}}).GET;
let result=await handler(new Request('http://localhost'),{params:Promise.resolve({id:'1'})});assert.equal(result.status,403);assert.equal(reads,0);
viewer={id:2,role:'student',loginContext:'student'};
result=await handler(new Request('http://localhost'),{params:Promise.resolve({id:'1'})});assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(reads,1);
result=await handler(new Request('http://localhost'),{params:Promise.resolve({id:'999'})});assert.equal(result.status,404);assert.equal(reads,1);
db.close();console.log('Passed: all dashboard detail families covered; page/API redirects and rewrites; invalid, cross-role and cross-operation tokens; expired/revoked sessions; file owner/class/faculty scope and draft privacy.');

})().catch(error=>{console.error(error);process.exitCode=1});
