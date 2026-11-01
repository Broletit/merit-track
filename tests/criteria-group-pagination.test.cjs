
const fs=require('fs'),ts=require('typescript'),Module=require('module'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),assert=require('assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);return m.exports.default;}
const DataTable=load('src/components/common/DataTable.tsx');
const Table=load('src/components/shared/criteria/CriteriaTable.tsx',{"@/components/common/DataTable":DataTable});
const Footer=({children,totalResults})=>React.createElement('footer',null,totalResults,children);
const groups=Array.from({length:4},(_,g)=>React.createElement('section',{key:g},React.createElement('h3',null,'Group-'+g),React.createElement(Table,null,React.createElement('thead',null,React.createElement('tr',null,React.createElement('th',null,'Criterion'))),React.createElement('tbody',null,Array.from({length:14},(_,i)=>React.createElement('tr',{key:i},React.createElement('td',null,'G'+g+'-criterion-'+i)))))));
const Pagination=load('src/components/shared/criteria/CriteriaGroupsPagination.tsx',{"@/components/common/TableResultsFooter":Footer});
const first=renderToStaticMarkup(React.createElement(Pagination,{totalGroups:4},groups));
assert.equal((first.match(/<table/g)||[]).length,3);assert.equal((first.match(/<tbody>/g)||[]).length,3);
for(let g=0;g<3;g++)for(let i=0;i<14;i++)assert(first.includes('G'+g+'-criterion-'+i));
assert(!first.includes('Group-3'));assert.equal((first.match(/<footer/g)||[]).length,1,'Only group pagination, no per-criterion footer');
const secondPage=load('src/components/shared/criteria/CriteriaGroupsPagination.tsx',{"react":{...React,useState:()=>[2,()=>{}],useRef:()=>({current:null})},"@/components/common/TableResultsFooter":Footer});
const second=renderToStaticMarkup(secondPage({totalGroups:4,children:groups}));
assert(second.includes('Group-3'));assert(!second.includes('Group-0'));assert.equal((second.match(/<table/g)||[]).length,1);for(let i=0;i<14;i++)assert(second.includes('G3-criterion-'+i));
const shrunk=renderToStaticMarkup(secondPage({totalGroups:1,children:groups.slice(0,1)}));assert(shrunk.includes('Group-0'),'Page clamps after groups removed');
for(const file of ['src/components/admin/criteria-templates/CriteriaTemplateStructureTable.tsx','src/components/shared/criteria/CriteriaDefinitionTable.tsx','src/components/shared/submissions/SubmissionCriteriaDetailList.tsx','src/components/student/submissions/StudentSubmissionCriteriaList.tsx','src/components/student/events/StudentEventApplyForm.tsx','src/components/faculty-officer/officer-events/OfficerEventApplyForm.tsx']){const source=fs.readFileSync(file,'utf8');assert(source.includes('<CriteriaGroupsPagination'));assert(!source.includes('PaginatedTable'));}
console.log('Passed: pagination moves complete standards, all 14 criteria retained per standard, single footer, next page and deletion clamp, all six views integrated.');
