const fs=require('fs'),ts=require('typescript'),Module=require('module'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),assert=require('assert/strict');
const m=new Module('student-criteria',module);m.paths=module.paths;const original=m.require.bind(m);
const mocks={
"next/link":({children,...props})=>React.createElement('a',props,children),
"lucide-react":{Pencil:()=>null,SquareX:()=>null},
"@/components/shared/criteria/CriteriaGroupsPagination":({children})=>children,"@/components/shared/criteria/CriteriaTable":({children,className})=>React.createElement('table',{className},children),
"@/components/shared/criteria/AutoCriteriaAchievement":{AutoCriteriaMessage:({message})=>React.createElement('p',null,message)},
"@/lib/ui/dialogScroll":{preserveDialogScroll:fn=>fn()}
};m.require=name=>Object.hasOwn(mocks,name)?mocks[name]:original(name);
m._compile(ts.transpileModule(fs.readFileSync('src/components/student/submissions/StudentSubmissionCriteriaList.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,'student-criteria');
const Component=m.exports.default;
const item={code:'A1',title:'Criterion one',description:'Description',group_code:'A',group_title:'Group A',evidence_type:'manual',is_required:1,auto_passed:0,auto_message:null,content_text:'Private evidence contents',file_count:1,review_decision:'fail',review_round:2,files:[{id:51,fileName:'evidence.pdf',mimeType:'application/pdf'}]};
const auto={...item,code:'B1',group_code:'B',group_title:'Group B',auto_passed:1,auto_message:'Automatic from activity',content_text:null,files:[],file_count:0,review_decision:null};
const html=renderToStaticMarkup(React.createElement(Component,{items:[item,auto],editable:false}));
assert.equal((html.match(/<table /g)||[]).length,2);assert(html.includes('href="/api/submissions/files/51"'));assert(html.includes('target="_blank"'));assert(!html.includes('Private evidence contents'));assert(!html.includes('<iframe'));assert(!html.includes('<img'));assert(html.includes('rounded-full'));assert(!html.includes('href="/edit"'));assert(html.includes('Automatic from activity'));
const edit=renderToStaticMarkup(React.createElement(Component,{items:[item],editable:true,editHref:'/edit'}));assert(edit.includes('href="/edit"'));
console.log('Passed: criteria grouped into tables; protected evidence links; text hidden until opened; no embedded previews; consistent pill badges; read-only/edit permissions preserved.');
