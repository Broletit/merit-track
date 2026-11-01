require('./helpers/mysql-fixture.cjs');
const fs=require('fs'),ts=require('typescript'),Module=require('module'),assert=require('node:assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;}
(async()=>{
  let sessions=0,active=1;
  const db={prepare(sql){assert(!/auth_login_limits|INSERT|UPDATE|DELETE/i.test(sql),'Login must not count attempts or lock accounts');return{get(account){return{id:1,mssv:account,role:'student',is_active:active,must_change_pw:0,password_hash:'fixture'};}};}};
  const roles=load('src/server/auth/role-context.ts');
  const session={createSession:async()=>{sessions++;},revokeCurrentSession:async()=>{}};
  const action=load('src/app/(auth)/login/actions.ts',{
    '@/server/db/mysql':{getDatabase:()=>db},'@/server/auth/password':{verifyPassword:async password=>password==='correct-password'},
    '@/server/auth/session':session,'@/server/auth/role-context':roles,
    'next/navigation':{redirect:path=>{throw new Error('REDIRECT:'+path);}},
  }).loginAction;
  function form(account,password){const f=new FormData();f.set('mssv',account);f.set('password',password);return f;}
  for(let i=0;i<20;i++)assert.equal((await action({},form('25000001','wrong'))).ok,false);
  assert.equal(sessions,0);
  await assert.rejects(action({},form('25000001','correct-password')),{message:'REDIRECT:/dashboard/student'});
  // No IP/header dependency: all callers may share the same network.
  for(let i=0;i<400;i++)await assert.rejects(action({},form(String(25000000+i),'correct-password')),{message:'REDIRECT:/dashboard/student'});
  assert.equal(sessions,401);
  active=0;
  assert.equal((await action({},form('25000001','correct-password'))).ok,false);
  assert.equal(sessions,401,'Admin-disabled accounts must remain blocked');
  const Database=require('better-sqlite3'),fixture=new Database(':memory:');
  fixture.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,mssv TEXT,full_name TEXT,email TEXT,password_hash TEXT,role TEXT,is_active INTEGER); INSERT INTO users VALUES(1,'25000001','Student A','student@example.com','fixture','student',1)");
  const mssvOnly=load('src/app/(auth)/login/actions.ts',{'@/server/db/mysql':{getDatabase:()=>fixture},'@/server/auth/password':{verifyPassword:async()=>true},'@/server/auth/session':session,'@/server/auth/role-context':roles,'next/navigation':{redirect:path=>{throw new Error('REDIRECT:'+path);}}}).loginAction;
  const before=sessions;
  assert.equal((await mssvOnly({},form('student@example.com','correct-password'))).ok,false);
  assert.equal(sessions,before,'Email must not authenticate even with a correct password');
  await assert.rejects(mssvOnly({},form('25000001','correct-password')),{message:'REDIRECT:/dashboard/student'});
  fixture.close();
  const legacy=load('src/server/auth/auth.ts',{
    '@/server/db/mysql':{getDatabase:()=>db},'./password':{verifyPasswordSync:password=>password==='correct-password'},
    './session':session,'./getSessionUser':{getSessionUser:async()=>null},'./role-context':roles,
  }).loginWithPassword;
  active=1;
  for(let i=0;i<20;i++)assert.equal((await legacy({mssv:'25000001',password:'wrong',ip:'shared-ip'})).ok,false);
  assert.equal((await legacy({mssv:'25000001',password:'correct-password',ip:'shared-ip'})).ok,true);
  console.log('Passed: both login paths allow correct credentials after repeated failures; 400 simulated shared-network logins are not rate-blocked; admin-disabled accounts remain blocked. This is a logic test, not a load test.');
})().catch(error=>{console.error(error);process.exitCode=1;});
