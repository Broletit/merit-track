const fs=require('fs'),ts=require('typescript'),Module=require('module'),assert=require('assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;}
function nodes(n){if(!n||typeof n!=='object')return [];return[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
const achievement=load('src/components/shared/criteria/AutoCriteriaAchievement.tsx');
assert.equal(achievement.AutoCriteriaBadge().props.children,'Đã đạt');
const titles=['Tham gia Hoạt động về nguồn tại Công viên Lịch sử - Văn hóa dân tộc','Định hướng TSV K22'];
assert.equal(achievement.formatAutoCriteriaMessage(null,JSON.stringify(titles)),'Đạt tự động từ hoạt động: '+titles.join(', '));
assert.equal(achievement.formatAutoCriteriaMessage('Đạt tự động từ hoạt động: '+titles.join('||')),'Đạt tự động từ hoạt động: '+titles.join(', '));
const Detail=load('src/components/shared/submissions/SubmissionCriteriaDetailList.tsx',{'@/components/shared/criteria/AutoCriteriaAchievement':achievement,'./CriteriaReviewDecision':{default:()=>null},'./SubmissionEvidenceLinks':()=>null,'@/components/shared/criteria/CriteriaGroupsPagination':({children})=>children,'@/components/shared/criteria/CriteriaTable':()=>null,'next/link':{default:()=>null}}).default;
const tree=Detail({items:[{code:'A1',title:'Activity criterion',description:null,group_code:'A',group_title:'Group',min_required:1,evidence_type:'auto',is_required:1,auto_passed:1,auto_message:'Đạt tự động từ hoạt động: '+titles.join(', '),content_text:null,file_count:0}]});
assert(nodes(tree).some(n=>n.type==='span'&&n.props.children==='Đã đạt'));
assert(!JSON.stringify(tree).includes('Đã đạt tự động'));
assert(nodes(tree).some(n=>n.type===achievement.AutoCriteriaMessage&&n.props.message.includes('Định hướng TSV K22')));
for(const path of ['src/components/review/submission-detail/ReviewCriteriaItemRow.tsx','src/components/admin/submissions/SubmissionCriteriaList.tsx'])assert(!/>\s*Đạt tự động\s*<\/span>/.test(fs.readFileSync(path,'utf8')));
assert(!fs.readFileSync('src/components/shared/reviews/ReviewHistory.tsx','utf8').includes('Kết quả từng vòng'));
console.log('Passed: unified achieved badge, multiple activity names, detail status/message separation, legacy role labels and redundant heading removed.');
