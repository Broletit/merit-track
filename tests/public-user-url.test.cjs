require('./helpers/mysql-fixture.cjs');
const fs = require('fs'), ts = require('typescript'), Module = require('module');
const Database = require('better-sqlite3'), assert = require('node:assert/strict');
function load(file, mocks = {}) {
  const m = new Module(file, module); m.paths = module.paths;
  const req = m.require.bind(m);
  m.require = id => Object.hasOwn(mocks, id) ? mocks[id] : req(id);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText, file);
  return m.exports;
}
(async () => {
  const db = new Database(':memory:');
  db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,role TEXT); CREATE TABLE user_public_ids(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,token TEXT NOT NULL UNIQUE); INSERT INTO users VALUES(1066,'student'),(1,'admin');");
  const ids = load('src/server/auth/publicUserId.ts');
  const token = ids.getUserPublicId(db, 1066);
  assert.match(token, /^[a-f0-9]{32}$/);
  assert.equal(ids.getUserPublicId(db, 1066), token);
  assert.equal(ids.resolveUserPublicId(db, token), 1066);
  for (const id of [0, -1, 1.5, 999, 1]) assert.equal(ids.getUserPublicId(db, id), null);
  for (const value of ['1066', "' OR 1=1", 'a'.repeat(32), '../1066']) assert.equal(ids.resolveUserPublicId(db, value), null);
  let allowed = true, dbCalls = 0;
  const mocks = {
    '@/server/auth/guards': {requireAdminContext: async () => {if (!allowed) throw new Error('FORBIDDEN');}},
    '@/server/db/mysql': {getDatabase: () => {dbCalls++; return db;}},
    '@/server/auth/publicUserId': ids,
    '@/server/cohorts/classCohortIntegrity': {getTransferClassOptions:()=>[]},
    'next/navigation': {redirect: path => {throw new Error('REDIRECT:' + path);}, notFound: () => {throw new Error('NOT_FOUND');}},
  };
  for (const name of ['FacultyClassAssignmentForm','UserAccountAdminForm','UserClassAdminForm']) mocks['@/components/admin/users/' + name] = {default: () => null};
  const page = load('src/app/dashboard/admin/users/[id]/page.tsx', mocks).default;
  await assert.rejects(page({params:Promise.resolve({id:'1066'})}), {message:'REDIRECT:/dashboard/admin/users/' + token});
  await assert.rejects(page({params:Promise.resolve({id:'999'})}), {message:'NOT_FOUND'});
  await assert.rejects(page({params:Promise.resolve({id:'a'.repeat(32)})}), {message:'NOT_FOUND'});
  const previousCalls = dbCalls;
  allowed = false;
  await assert.rejects(page({params:Promise.resolve({id:token})}), {message:'FORBIDDEN'});
  await assert.rejects(page({params:Promise.resolve({id:'1066'})}), {message:'FORBIDDEN'});
  assert.equal(dbCalls, previousCalls, 'Authorization must run before resolving or creating tokens');
  db.close();
  console.log('Passed: stable opaque user IDs, legacy redirect, invalid IDs, admin-only access before database resolution.');
})().catch(error => {console.error(error);process.exitCode=1;});
