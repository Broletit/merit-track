const fs=require('fs'),ts=require('typescript'),Module=require('module'),assert=require('assert/strict');
let ended=0;
const records=[{id:1,status:'attended',import_batch_id:3,attendance_note:null},{id:2,status:'attended',import_batch_id:null,attendance_note:'Quét QR thành công'},{id:3,status:'registered',import_batch_id:null,attendance_note:null}];
const db={prepare(sql){return {get(){return sql.includes('AS ended')?{ended}:{total:records.length};},all(){return records;}};}};
const m=new Module('registrations',module);m.paths=module.paths;
const native=m.require.bind(m),Dummy=()=>null;
m.require=id=>id==='@/server/db/mysql'?{getDatabase:()=>db}:id==='@/server/conduct/ensureActivityConductScores'?{ensureActivityConductScores(){}}:id==='@/lib/utils/formatDateTimeVN'?{formatDateTimeVN:()=>''}:id.startsWith('@/components/')||id==='./CancelRegistrationControl'?{__esModule:true,default:Dummy}:native(id);
m._compile(ts.transpileModule(fs.readFileSync('src/components/admin/activities/AdminActivityRegistrations.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,'registrations');
function nodes(n){if(!n||typeof n!=='object')return [];return[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
for(ended of [0,1]){const tree=nodes(m.exports.default({activityId:1}));const headers=tree.filter(n=>n.type==='th').map(n=>n.props.children);assert.equal(headers.includes('Thao tác'),!ended);assert(headers.includes('Hình thức điểm danh'));assert(tree.some(n=>n.type==='td'&&n.props.children==='Cập nhật từ danh sách'));assert(tree.some(n=>n.type==='td'&&n.props.children==='Quét mã'));for(const tr of tree.filter(n=>n.type==='tr'))assert.equal([tr.props.children].flat(Infinity).filter(n=>n&&['td','th'].includes(n.type)).length,ended?6:7);}
console.log('Passed: completed activity hides action header/cells; attendance sources and aligned table columns.');
