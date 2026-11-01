
const fs=require('fs'),ts=require('typescript'),Module=require('module'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),assert=require('assert/strict');
function load(file,mocks={}){const m=new Module(file,module);m.paths=module.paths;const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return m.exports;}

const styles={card:'stat-card',label:'stat-label',value:'stat-value',icon:'stat-icon'};
const icons={Activity:()=>null,CalendarCheck:()=>null,UserCheck:()=>null,Users:()=>null};
const Cards=load('src/components/admin/dashboard/AdminStatsCards.tsx',{"@/components/shared/statistics/StatCard.module.css":{default:styles},"lucide-react":icons}).default;
const html=renderToStaticMarkup(React.createElement(Cards,{stats:{totalStudents:123,totalActivities:42,totalParticipations:250,totalCampaigns:8}}));
assert.equal((html.match(/class="stat-card /g)||[]).length,4);
assert(html.includes('grid-cols-2'));assert(html.includes('xl:grid-cols-4'));
for(const number of [123,42,250,8])assert(html.includes('>'+number+'</div>'));
const css=fs.readFileSync('src/components/shared/statistics/StatCard.module.css','utf8');
assert(css.includes('padding: 12px 16px'));assert(css.includes('prefers-reduced-motion'));
assert(!/emerald|violet|rose|amber/.test(css));
console.log('Passed: compact unified blue statistics, figures and responsive column layout preserved, reduced motion supported.');
