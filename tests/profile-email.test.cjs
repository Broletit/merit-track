require('./helpers/mysql-fixture.cjs');
const fs=require('fs'),ts=require('typescript'),Module=require('module'),Database=require('better-sqlite3'),assert=require('node:assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:id==='@/lib/validation/gmail'?load('src/lib/validation/gmail.ts'):req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;}
function all(node){if(!node||typeof node!=='object')return[];return[node,...[node.props?.children].flat(Infinity).flatMap(all)];}
(async()=>{
  const db=new Database(':memory:');
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,mssv TEXT,full_name TEXT,email TEXT,role TEXT,is_active INTEGER,updated_at TEXT);
    INSERT INTO users VALUES(1,'25000001','Student A',NULL,'student',1,NULL),(2,'25000002','Student B','other@example.com','student',1,NULL),(3,'25000003','Faculty','faculty@example.com','faculty_officer',1,NULL),(4,'admin','Admin','admin@example.com','admin',1,NULL),(5,'25000005','Inactive',NULL,'student',0,NULL);
    CREATE TABLE password_reset_requests(user_id INTEGER,consumed_at INTEGER);INSERT INTO password_reset_requests VALUES(1,NULL),(2,NULL);
    CREATE TABLE audit_logs(actor_user_id INTEGER,action TEXT,entity_type TEXT,entity_id TEXT,reason TEXT,before_json TEXT,after_json TEXT,meta_json TEXT,created_at TEXT);`);
  let actor={id:1,role:'student'},dbCalls=0;const revalidations=[];
  const update=load('src/server/actions/profile/updateProfileEmail.ts',{
    '@/server/auth/guards':{requireLogin:async()=>{if(!actor)throw Error('AUTH_DENIED');return actor;}},
    '@/server/db/mysql':{getDatabase:()=>{dbCalls++;return db;}},'next/cache':{revalidatePath:(...args)=>revalidations.push(args)},
    '@/server/audit/writeAuditLog':load('src/server/audit/writeAuditLog.ts'),
  }).updateProfileEmail;
  const form=email=>{const f=new FormData();f.set('email',email);return f;};
  for(const value of ['', ' ', 'invalid', 'a@b', 'thudao01102003@gmai.com', 'abcdef@yahoo.com', 'ab@gmail.com', '.abcdef@gmail.com', 'abcdef.@gmail.com', 'abc..def@gmail.com', 'abc_def@gmail.com', 'abc+def@gmail.com', 'a'.repeat(31)+'@gmail.com', 'a'.repeat(255)+'@gmail.com']){const result=await update({},form(value));assert.equal(result.ok,false);assert(result.fieldError);}
  const forged=form('  Student.One@GMAIL.com  ');for(const [key,value] of Object.entries({userId:'2',id:'2',role:'admin',full_name:'Hacked',mssv:'99999999',is_active:'0'}))forged.set(key,value);
  const result=await update({},forged);assert(result.ok);assert.equal(result.email,'student.one@gmail.com');
  const first=db.prepare('SELECT * FROM users WHERE id=1').get();assert.equal(first.email,'student.one@gmail.com');assert.equal(first.role,'student');assert.equal(first.full_name,'Student A');assert.equal(first.mssv,'25000001');assert.equal(first.is_active,1);
  assert.equal(db.prepare('SELECT email FROM users WHERE id=2').get().email,'other@example.com');
  assert(db.prepare('SELECT consumed_at FROM password_reset_requests WHERE user_id=1').get().consumed_at);
  assert.equal(db.prepare('SELECT consumed_at FROM password_reset_requests WHERE user_id=2').get().consumed_at,null);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM audit_logs').get().n,0);assert(revalidations.some(args=>args[0]==='/dashboard'&&args[1]==='layout'));
  assert.equal((await update({},form('STUDENT.ONE@gmail.com'))).ok,false);
  actor={id:4,role:'admin'};assert.equal((await update({},form('changed@example.com'))).ok,false);
  actor={id:5,role:'student'};assert.equal((await update({},form('changed@example.com'))).ok,false);
  actor=null;const before=dbCalls;assert.equal((await update({},form('changed@example.com'))).ok,false);assert.equal(dbCalls,before);

  const Badge=()=>null,Link=()=>null;
  const Group=load('src/components/layout/SidebarGroup.tsx',{'./MissingEmailBadge':{__esModule:true,default:Badge},'next/link':{__esModule:true,default:Link},react:{useMemo:fn=>fn()}}).default;
  const group={label:'Account',icon:()=>null,items:[{href:'/dashboard/student/profile',label:'Profile',icon:()=>null}]};
  for(const collapsed of [true,false]){
    assert(all(Group({group,pathname:'/dashboard/student',collapsed,emailMissing:true})).some(n=>n.type===Badge));
    assert(!all(Group({group,pathname:'/dashboard/student',collapsed,emailMissing:false})).some(n=>n.type===Badge));
  }
  const Mobile=load('src/components/layout/MobileNavigation.tsx',{
    './MissingEmailBadge':{__esModule:true,default:Badge},'./SidebarGroup':{__esModule:true,default:Group},
    './getSidebarItems':{getSidebarGroups:()=>[group]},'next/navigation':{usePathname:()=>'/dashboard/student'},'next/image':{__esModule:true,default:()=>null},react:{useRef:()=>({current:null}),useEffect(){}},
  }).default;
  const mobile=all(Mobile({role:'student',emailMissing:true}));assert(mobile.some(n=>n.type===Badge));assert(mobile.some(n=>n.type===Group&&n.props.emailMissing));
  const Sidebar=()=>null,Topbar=()=>null;
  const Layout=load('src/components/layout/DashboardLayout.tsx',{'./SiteFooter':{__esModule:true,default:()=>null},'./Sidebar':{__esModule:true,default:Sidebar},'./Topbar':{__esModule:true,default:Topbar},'@/server/auth/role-context':{getUiLabelByLoginContext:()=>''}}).default;
  for(const email of [null,'','   ','wrong@gmai.com','student.one@gmail.com']){
    const nodes=all(Layout({children:null,user:{full_name:'A',role:'student',loginContext:'student',email}}));
    assert.equal(nodes.find(n=>n.type===Sidebar).props.emailMissing,!load('src/lib/validation/gmail.ts').isValidGmailAddress(email));assert.equal(nodes.find(n=>n.type===Topbar).props.emailMissing,!load('src/lib/validation/gmail.ts').isValidGmailAddress(email));
  }
  db.close();console.log('Passed: only own email can change; valid nonempty email required; forged IDs/roles/profile fields ignored; inactive/admin/anonymous denied; old recovery codes invalidated; no self-service audit storage/revalidation; missing-email warnings in expanded/collapsed/mobile navigation and cleared after email exists.');
})().catch(error=>{console.error(error);process.exitCode=1;});
