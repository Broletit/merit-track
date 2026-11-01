require('./helpers/mysql-fixture.cjs');

const fs=require('fs'),ts=require('typescript'),Module=require('module'),Database=require('better-sqlite3'),assert=require('assert/strict');
const db=new Database(':memory:');
db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,full_name TEXT,mssv TEXT,role TEXT,is_active INTEGER,updated_at TEXT);CREATE TABLE class_members(class_id INTEGER,user_id INTEGER,joined_at TEXT,left_at TEXT);CREATE TABLE faculty_class_assignments(faculty_officer_id INTEGER,class_id INTEGER);CREATE TABLE sessions(user_id INTEGER,revoked_at TEXT);INSERT INTO users VALUES(1,'Admin','admin','admin',1,NULL),(2,'Faculty','21111111','faculty_officer',1,NULL),(11,'Student','21111112','student',1,NULL);INSERT INTO class_members VALUES(1,2,'2026-01-01',NULL),(1,11,'2026-01-01',NULL);INSERT INTO faculty_class_assignments VALUES(2,1);INSERT INTO sessions VALUES(2,NULL),(11,NULL);");
for(let id=3;id<=10;id++){db.prepare("INSERT INTO users VALUES(?,?,?,'class_officer',1,NULL)").run(id,'Officer '+id,'211111'+id);db.prepare("INSERT INTO class_members VALUES(1,?,'2026-01-01',NULL)").run(id);}
let auditCount=0,failAudit=false;
const mocks={"next/cache":{revalidatePath(){}},"@/server/auth/guards":{requireAdminContext:async()=>({id:1})},"@/server/db/mysql":{getDatabase:()=>db},"@/server/audit/writeAuditLog":{requireChangeReason:value=>String(value),writeAuditLog(){if(failAudit)throw Error('Audit failure');auditCount++;}}};
const m=new Module('update-role',module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync('src/server/actions/admin/users/updateUserAdmin.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'update-role');
const update=m.exports.updateUserAdmin;
(async()=>{
const form=new FormData();form.set('role','class_officer');form.set('isActive','1');form.set('reason','Valid change reason');
for(const id of [2,11]){const before=db.prepare('SELECT * FROM users WHERE id=?').get(id);await assert.rejects(update(id,form));assert.deepEqual(db.prepare('SELECT * FROM users WHERE id=?').get(id),before);}
assert.equal(db.prepare('SELECT COUNT(*) n FROM faculty_class_assignments WHERE faculty_officer_id=2').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE revoked_at IS NOT NULL').get().n,0);assert.equal(auditCount,0);
db.prepare("UPDATE users SET role='student' WHERE id=3").run();
failAudit=true;await assert.rejects(update(2,form),/Audit failure/);assert.equal(db.prepare('SELECT role FROM users WHERE id=2').get().role,'faculty_officer');assert.equal(db.prepare('SELECT COUNT(*) n FROM faculty_class_assignments WHERE faculty_officer_id=2').get().n,1);assert.equal(db.prepare('SELECT revoked_at FROM sessions WHERE user_id=2').get().revoked_at,null);
failAudit=false;await update(2,form);assert.equal(db.prepare('SELECT role FROM users WHERE id=2').get().role,'class_officer');assert.equal(db.prepare('SELECT COUNT(*) n FROM faculty_class_assignments WHERE faculty_officer_id=2').get().n,0);assert.equal(auditCount,1);
const ui=fs.readFileSync('src/components/admin/users/UserAccountAdminForm.tsx','utf8');assert(ui.includes('setSelectedRole(currentRole);'));assert(ui.includes('setSelectedActive(currentActive ? "1" : "0");'));
db.close();console.log('Passed: full class preserves faculty/student roles, assignments and sessions; late errors roll back; valid change succeeds; UI restores current values.');
})().catch(error=>{console.error(error);process.exitCode=1;});
