require('./helpers/mysql-fixture.cjs');
const fs=require('fs'),ts=require('typescript'),Module=require('module'),Database=require('better-sqlite3'),assert=require('node:assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:id==='@/lib/validation/gmail'?load('src/lib/validation/gmail.ts'):req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;}
(async()=>{
  const db=new Database(':memory:');
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,mssv TEXT,email TEXT,is_active INTEGER,password_hash TEXT,must_change_pw INTEGER,updated_at TEXT);
    INSERT INTO users VALUES(1,'25000001','student@gmail.com',1,'old',0,NULL),(2,'25000002','second@gmail.com',1,'old',0,NULL);
    CREATE TABLE password_reset_requests(id TEXT PRIMARY KEY,user_id INTEGER,identity_hash TEXT,ip_hash TEXT,code_hash TEXT,created_at INTEGER,expires_at INTEGER,attempts INTEGER DEFAULT 0,consumed_at INTEGER);
    CREATE TABLE sessions(id TEXT,user_id INTEGER,revoked_at TEXT); INSERT INTO sessions VALUES('old-session',1,NULL);`);
  let sent=[],fail=false,hold=null;
  const reset=load('src/server/auth/passwordReset.ts');
  const actions=load('src/app/(auth)/forgot-password/actions.ts',{
    'next/headers':{headers:async()=>new Headers()},'@/server/db/mysql':{getDatabase:()=>db},
    '@/server/auth/passwordReset':reset,'@/server/auth/password':{hashPassword:async()=> 'new-hash'},
    '@/server/email/resetMail':{getResetMailConfig:()=>({secret:'a'.repeat(64)}),sendPasswordResetCode:async(to,code)=>{if(fail)throw Error('Resend failed');sent.push({to,code});if(hold)await new Promise(resolve=>hold(resolve));}},
  });
  const request=(account='25000001',email='student@gmail.com')=>{const f=new FormData();f.set('account',account);f.set('email',email);return f;};
  let r=await actions.requestResetCode({},request('25000001','wrong.user@gmail.com'));assert.equal(r.ok,false);assert(r.message.includes('khớp'));assert.equal(sent.length,0);
  let release,settled=false;hold=resolve=>{release=resolve;};
  const pending=actions.requestResetCode({},request()).then(result=>{settled=true;return result;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false,'Do not report sent before provider accepts');release();
  const first=await pending;hold=null;assert(first.ok);assert(first.message.includes('student@gmail.com'));assert(first.expiresAt>Date.now());assert(first.resendAt>Date.now());
  r=await actions.requestResetCode({},request());assert.equal(r.ok,false);assert(r.message.includes('60'));assert.equal(sent.length,1);
  db.prepare('UPDATE password_reset_requests SET created_at=? WHERE id=?').run(Date.now()-61000,first.challengeId);
  const next=await actions.requestResetCode({},request());assert(next.ok);assert.notEqual(next.challengeId,first.challengeId);assert(db.prepare('SELECT consumed_at FROM password_reset_requests WHERE id=?').get(first.challengeId).consumed_at);
  const form=new FormData();form.set('challengeId',next.challengeId);form.set('code',sent.at(-1).code);form.set('newPassword','new-password');form.set('confirmPassword','new-password');
  r=await actions.resetPassword({},form);assert(r.ok&&r.completed);assert.equal(db.prepare('SELECT password_hash FROM users WHERE id=1').get().password_hash,'new-hash');assert(db.prepare('SELECT revoked_at FROM sessions').get().revoked_at);
  fail=true;r=await actions.requestResetCode({},request('25000002','second@gmail.com'));assert.equal(r.ok,false);assert.equal(db.prepare('SELECT COUNT(*) n FROM password_reset_requests WHERE user_id=2').get().n,0);

  db.prepare("UPDATE sessions SET revoked_at=NULL").run();
  let created=0,deleted=0;
  const auth=load('src/server/auth/auth.ts',{'@/server/db/mysql':{getDatabase:()=>db},'./password':{verifyPasswordSync:()=>true,hashPasswordSync:()=> 'changed-while-signed-in'},'./session':{createSession:async()=>{created++;},revokeCurrentSession:async()=>{deleted++;}},'./getSessionUser':{getSessionUser:async()=>({id:1,role:'student',loginContext:'student'})},'./role-context':{getDefaultLoginContextAfterLogin:()=> 'student'}});
  const change=load('src/app/(auth)/change-password/actions.ts',{'@/server/auth/auth':auth}).changePasswordAction;
  const changeForm=new FormData();changeForm.set('currentPassword','old-password');changeForm.set('newPassword','another-new-password');changeForm.set('confirmPassword','another-new-password');
  const changed=await change({},changeForm);assert(changed.ok);assert.equal(created,0);assert.equal(deleted,0,'No cookie mutation may interrupt the success dialog');assert(db.prepare('SELECT revoked_at FROM sessions').get().revoked_at);
  // Execute the real client component with persistent hook state.
  const values=[],actionValues=[],actionFns=[];let cursor=0,actionCursor=0;
  let response={ok:true,challengeId:'first-code',email:'student@gmail.com',message:'Sent',expiresAt:Date.now()+600000,resendAt:Date.now()-1};
  const Success=()=>null; const Gmail=()=>null;
  const Component=load('src/app/(auth)/forgot-password/ForgotPasswordForm.tsx',{
    react:{useState:init=>{const i=cursor++;if(!(i in values))values[i]=typeof init==='function'?init():init;return[values[i],value=>values[i]=value];},useEffect(){},useActionState:(fn,initial)=>{const i=actionCursor++;actionFns[i]=async form=>actionValues[i]=await fn(actionValues[i]??initial,form);return[actionValues[i]??initial,actionFns[i],false];}},
    'next/link':{default:()=>null},'@/components/common/RequiredMark':{default:()=>null},'@/components/shared/ActionFeedback':{default:()=>null},'@/components/shared/PasswordChangeSuccess':{__esModule:true,default:Success},
    '@/components/common/GmailInput':{__esModule:true,default:Gmail},
    './actions':{requestResetCode:async()=>response,resetPassword:async()=>({ok:true,completed:true,message:'Done'})},
  }).default;
  const render=()=>{cursor=0;actionCursor=0;return Component();};
  function all(node){if(!node||typeof node!=='object')return[];return[node,...[node.props?.children].flat(Infinity).flatMap(all)];}
  let tree=render();assert.equal(all(tree).find(n=>n.type===Gmail).props.error,'','Gmail starts without a required warning');
  await actionFns[0](request('25000001',''));tree=render();assert(all(tree).find(n=>n.type===Gmail).props.error,'Empty Gmail warns only after requesting a code');
  const inputs=all(tree).filter(n=>n.type==='input');inputs.find(n=>n.props.name==='account').props.onChange({target:{value:'25000001'}});all(tree).find(n=>n.type===Gmail).props.onChange('student@gmail.com');
  await actionFns[0](request());tree=render();assert(all(tree).some(n=>n.type==='input'&&n.props.name==='code'));assert(!all(tree).some(n=>n.type==='input'&&n.props.name==='account'&&n.props.type!=='hidden'));
  const resend=all(tree).find(n=>n.type==='form'&&all(n).some(child=>child.type==='input'&&child.props.name==='account'));
  response={...response,challengeId:'second-code'};await resend.props.action(request());tree=render();assert(all(tree).some(n=>n.props?.name==='challengeId'&&n.props.value==='second-code'));assert(all(tree).some(n=>n.props?.name==='code'));
  response={ok:false,message:'Delivery failed'};await actionFns[0](request());tree=render();assert(all(tree).some(n=>n.props?.name==='challengeId'&&n.props.value==='second-code'),'Failed resend must retain previous challenge');
  await actionFns[1](new FormData());tree=render();assert(all(tree).some(n=>n.type===Success));

  let effect,timer,navigations=0;const dialog={showModal(){}};
  global.window={location:{replace:path=>{assert.equal(path,'/login');navigations++;}},setTimeout:(fn,ms)=>{assert.equal(ms,3000);timer=fn;return 1;},clearTimeout(){}};
  const Modal=load('src/components/shared/PasswordChangeSuccess.tsx',{react:{useRef:()=>({current:dialog}),useEffect:fn=>effect=fn}}).default;
  const modal=Modal();effect();timer();assert.equal(navigations,1);
  assert(!all(modal).some(n=>n.type==='button'),'No close button');
  assert(!all(modal).some(n=>n.type==='p'),'No countdown explanation');
  modal.props.onCancel({preventDefault(){}});assert.equal(navigations,2);
  const target={getBoundingClientRect:()=>({left:10,right:100,top:10,bottom:100})};modal.props.onClick({target,currentTarget:target,clientX:200,clientY:200});assert.equal(navigations,3);
  db.close();console.log('Passed: exact MSSV/email matching, actual send acknowledgement, resend cooldown and code rotation, provider failure, countdown state, resend stays in code form, session revocation, 3-second/Escape/outside success navigation. No real emails sent.');
})().catch(error=>{console.error(error);process.exitCode=1;});
