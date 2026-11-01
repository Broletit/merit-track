require('./helpers/mysql-fixture.cjs');
const fs=require('fs'),path=require('path'),ts=require('typescript'),Module=require('module'),assert=require('node:assert/strict'),Database=require('better-sqlite3');
function loader(mocks={}) {
  const cache=new Map();
  function load(file) {
    file=path.resolve(file); if(cache.has(file))return cache.get(file).exports;
    const m=new Module(file,module);m.paths=module.paths;cache.set(file,m);
    const req=m.require.bind(m);
    m.require=id=>{
      if(Object.hasOwn(mocks,id))return mocks[id];
      if(id.startsWith('@/'))return load(path.join('src',id.slice(2))+'.ts');
      if(id.startsWith('.')){const resolved=path.resolve(path.dirname(file),id);if(fs.existsSync(resolved+'.ts'))return load(resolved+'.ts');}
      return req(id);
    };
    const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
    assert(!result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error),'Parse failure: '+file);
    m._compile(result.outputText,file);return m.exports;
  }
  return load;
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
(async()=>{
  let authCalls=0,dbCalls=0;
  const deny=async()=>{authCalls++;throw new Error('AUTH_DENIED');};
  const guards=Object.fromEntries(['requireLogin','requireAdmin','requireAdminContext','requireStudentContext','requireFacultyOfficerContext','requireClassOfficerContext'].map(name=>[name,deny]));
  const load=loader({
    '@/server/auth/guards':guards,
    '@/server/auth/getSessionUser':{getSessionUser:deny},
    '@/server/auth/requireOfficerParticipantContext':{requireOfficerParticipantContext:deny},
    '@/server/db/mysql':{getDatabase:()=>{dbCalls++;throw new Error('DATABASE_BEFORE_AUTH');}},
    'next/cache':{revalidatePath(){}},
    'next/navigation':{redirect(){throw new Error('REDIRECT');}},
  });
  let checked=0;
  for(const file of walk('src/server/actions').filter(p=>p.endsWith('.ts')&&/^['"]use server['"];/.test(fs.readFileSync(p,'utf8')))){
    const actions=load(file);
    for(const [name,action] of Object.entries(actions)){
      if(typeof action!=='function')continue;
      const before=authCalls;
      let result;try{result=await action(undefined,undefined,undefined);}catch(error){assert.equal(error.message,'AUTH_DENIED',file+'#'+name);}
      assert(authCalls>before,'Missing authorization: '+file+'#'+name);
      assert(!result||result.ok!==true,'Unauthorized success: '+file+'#'+name);
      assert.equal(dbCalls,0,'Database reached before authorization: '+file+'#'+name);
      checked++;
    }
  }
  // A real student session cannot call administrative actions, even with valid IDs/forms.
  let actor={id:2,role:'student',loginContext:'student',is_active:1};
  const realGuards=loader({'@/server/auth/getSessionUser':{getSessionUser:async()=>actor},'next/navigation':{redirect(){throw new Error('FORBIDDEN');}}})('src/server/auth/guards.ts');
  const restricted=loader({'@/server/auth/guards':realGuards,'@/server/db/mysql':{getDatabase:()=>{throw new Error('DB_REACHED');}},'next/cache':{revalidatePath(){}}});
  for(const [file,name,args] of [
    ['students/manageStudent','resetStudentPassword',[3]],['students/manageStudent','transferStudentClass',[3,20]],
    ['admin/users/updateUserAdmin','updateUserAdmin',[3,new FormData()]],['activities/deleteActivity','deleteActivity',[1,new FormData()]],
    ['students/previewImportStudents','previewImportStudents',[{rows:[{mssv:'25000001'}]}]],
  ])await assert.rejects(restricted('src/server/actions/'+file+'.ts')[name](...args),{message:'FORBIDDEN'});
  actor={id:4,role:'faculty_officer',loginContext:'student',is_active:1};
  await assert.rejects(realGuards.requireFacultyOfficerContext(),{message:'FORBIDDEN'});

  actor={id:2,role:'student',loginContext:'student',is_active:1,must_change_pw:1};
  await assert.rejects(realGuards.requireLogin(),{message:'FORBIDDEN'});
  const db=new Database(':memory:');
  db.exec(`CREATE TABLE class_members(user_id INTEGER,class_id INTEGER,left_at TEXT);INSERT INTO class_members VALUES(4,10,NULL);
    CREATE TABLE faculty_class_assignments(faculty_officer_id INTEGER,class_id INTEGER);INSERT INTO faculty_class_assignments VALUES(5,10);
    CREATE TABLE event_criteria_items(event_id INTEGER,code TEXT);INSERT INTO event_criteria_items VALUES(1,'A1'),(2,'B1');`);
  const review=loader()('src/server/auth/submissionReviewAccess.ts').assertSubmissionReviewAccess;
  const row={status:'submitted_v1',class_id:10,event_type:'student',review_open:1};
  const faculty={id:5,role:'faculty_officer',loginContext:'faculty_officer'};
  assert.doesNotThrow(()=>review(db,faculty,row));
  assert.throws(()=>review(db,{...faculty,id:6},row));
  assert.throws(()=>review(db,{...faculty,loginContext:'student'},row));
  assert.throws(()=>review(db,faculty,{...row,review_open:0}));
  assert.throws(()=>review(db,faculty,{...row,event_type:'officer'}));
  assert.throws(()=>review(db,faculty,{...row,status:'passed'}));
  assert.throws(()=>review(db,{id:4,role:'class_officer',loginContext:'class_officer'},{...row,status:'submitted_v2'}));
  const validate=loader()('src/server/submissions/validateEvidenceCriteria.ts').validateEvidenceCriteria;
  assert.doesNotThrow(()=>validate(db,1,['A1']));
  for(const codes of [['B1'],['../../outside'],['A1','A1']])assert.throws(()=>validate(db,1,codes));

  db.exec(`CREATE TABLE events(id INTEGER PRIMARY KEY,type TEXT,status TEXT,start_at TEXT,end_at TEXT,allow_late INTEGER); INSERT INTO events VALUES(1,'student','published','2020-01-01','2099-01-01',0);
    CREATE TABLE submissions(id INTEGER PRIMARY KEY,user_id INTEGER,event_id INTEGER,class_id INTEGER,status TEXT); INSERT INTO submissions VALUES(1,2,1,10,'draft'),(2,2,1,10,'submitted_v1');
    CREATE TABLE submission_items(submission_id INTEGER,criteria_code TEXT,content_text TEXT);
    CREATE TABLE submission_files(submission_id INTEGER,criteria_code TEXT);
    CREATE TABLE submission_auto_results(submission_id INTEGER,criteria_code TEXT,passed INTEGER);`);
  let student={id:3,role:'student',loginContext:'student'};
  const actions=loader({'@/server/db/mysql':{getDatabase:()=>db},'@/server/auth/guards':{requireStudentContext:async()=>student,requireLogin:async()=>({...faculty,id:6})},'next/cache':{revalidatePath(){}}});
  const evidence=actions('src/server/actions/submissions/saveStudentSubmissionEvidence.ts').saveStudentSubmissionEvidence;
  const forged=new FormData();forged.append('criteriaCode','../../outside');forged.set('note_../../outside','tampered');
  await assert.rejects(evidence(1,forged));
  student={id:2,role:'student',loginContext:'student'};
  await assert.rejects(evidence(1,forged));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM submission_items').get().n,0);
  const reviewAction=actions('src/server/actions/reviews/reviewSubmission.ts').reviewSubmission;
  await assert.rejects(reviewAction(2,'approve',new FormData()));
  assert.equal(db.prepare('SELECT status FROM submissions WHERE id=2').get().status,'submitted_v1');
  const editable=loader()('src/server/submissions/assertEvidenceEditable.ts').assertEvidenceEditable;
  assert.doesNotThrow(()=>editable(db,1,2,'student'));
  db.prepare("UPDATE events SET status='closed' WHERE id=1").run();
  assert.throws(()=>editable(db,1,2,'student'));
  const admin={id:1,role:'admin',loginContext:'admin'};
  assert.doesNotThrow(()=>review(db,admin,{...row,event_type:'officer'},true));
  assert.throws(()=>review(db,faculty,{...row,event_type:'officer'},true));
  const origin=loader()('src/server/auth/apiRequestGuard.ts').validateApiRequest;
  const req=(headers={})=>new Request('http://localhost:3000/api/cohorts',{method:'POST',headers});
  assert.equal(origin(req({'origin':'https://evil.example'})).status,403);
  assert.equal(origin(req({'origin':'null'})).status,403);
  assert.equal(origin(req({'sec-fetch-site':'cross-site'})).status,403);
  assert.equal(origin(req({'content-length':String(51*1024*1024)})).status,413);
  assert.equal(origin(req({'origin':'http://localhost:3000'})),null);
  assert.equal(origin(req()),null,'CLI requests may omit Origin but still need authentication and permissions');
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,role TEXT,password_hash TEXT,must_change_pw INTEGER,updated_at TEXT); INSERT INTO users VALUES(1,'admin','admin-hash',0,NULL),(2,'student','old',0,NULL);
  CREATE TABLE sessions(id TEXT,user_id INTEGER,revoked_at TEXT);INSERT INTO sessions VALUES('target',2,NULL),('other',1,NULL);`);
  const resetAction=loader({'@/server/db/mysql':{getDatabase:()=>db},'@/server/auth/guards':{requireAdminContext:async()=>admin},'@/server/auth/password':{hashPasswordSync:()=> 'reset-hash'},'next/cache':{revalidatePath(){}}})('src/server/actions/students/manageStudent.ts').resetStudentPassword;
  await resetAction(2);
  assert.equal(db.prepare('SELECT must_change_pw FROM users WHERE id=2').get().must_change_pw,1);
  assert(db.prepare("SELECT revoked_at FROM sessions WHERE id='target'").get().revoked_at);
  assert.equal(db.prepare("SELECT revoked_at FROM sessions WHERE id='other'").get().revoked_at,null);
  await assert.rejects(resetAction(1));
  assert.equal(db.prepare('SELECT password_hash FROM users WHERE id=1').get().password_hash,'admin-hash');
  db.exec(`ALTER TABLE users ADD COLUMN mssv TEXT; ALTER TABLE users ADD COLUMN full_name TEXT; ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1; UPDATE users SET mssv='25000002',full_name='Student A' WHERE id=2;
    CREATE TABLE activities(id INTEGER,title TEXT,status TEXT,start_at TEXT,end_at TEXT,qr_checkin_enabled INTEGER,conduct_score REAL); INSERT INTO activities VALUES(1,'Activity','published','2020-01-01','2099-01-01',1,2);
    CREATE TABLE activity_registrations(id INTEGER,activity_id INTEGER,user_id INTEGER,status TEXT); INSERT INTO activity_registrations VALUES(1,1,2,'cancelled');`);
  const scanner=loader({'@/server/db/mysql':{getDatabase:()=>db},'@/server/auth/guards':{requireLogin:async()=>faculty},'next/cache':{revalidatePath(){}}})('src/server/actions/activities/scanActivityQr.ts').scanActivityQr;
  assert.equal((await scanner(1,'25000002','manual')).ok,false);
  assert.equal(db.prepare('SELECT status FROM activity_registrations WHERE id=1').get().status,'cancelled');
  await assert.rejects(scanner(1,'25000002','forged-method'));
  db.close();
  console.log('Passed: '+checked+' protected Server Actions reject anonymous calls before DB access; student admin-call denial; role/context/class/state review matrix; forged evidence criteria; cross-site and oversized API requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
