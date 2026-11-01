import {getDatabase} from "@/server/db/mysql";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";
type Group={code:string;title:string;min_required:number;score_max:number};
type Criterion={code:string;title:string;description:string|null;group_code:string;is_required:number;score_max:number};
export default async function CriteriaDefinitionTable({eventId,templateId,title="Tiêu chuẩn / tiêu chí"}:{eventId?:number;templateId?:number;title?:string}){
 const db=getDatabase();
 const event = eventId ? (await db.first("SELECT criteria_template_id,type FROM events WHERE id=?", [eventId])) as {criteria_template_id:number|null;type:string}|undefined : (await db.first("SELECT id AS criteria_template_id,for_type AS type FROM criteria_templates WHERE id=?", [templateId ?? null])) as {criteria_template_id:number;type:string}|undefined;
 if(!event)return null;
 let groups=(await db.rows("SELECT code,title,min_required,score_max FROM event_criteria_groups WHERE event_id=? ORDER BY sort_order,code", [eventId ?? null])) as Group[];
 let items=(await db.rows("SELECT code,title,description,group_code,is_required,score_max FROM event_criteria_items WHERE event_id=? ORDER BY sort_order,code", [eventId ?? null])) as Criterion[];
 if(!groups.length&&event.criteria_template_id){
  groups=(await db.rows("SELECT code,title,min_required,score_max FROM criteria_template_groups WHERE template_id=? ORDER BY sort_order,code", [event.criteria_template_id])) as Group[];
  items=(await db.rows("SELECT code,title,description,group_code,is_required,score_max FROM criteria_template_items WHERE template_id=? ORDER BY sort_order,code", [event.criteria_template_id])) as Criterion[];
 }
 const rules=(await db.rows("SELECT car.criteria_code,a.title FROM criteria_activity_rules car JOIN activities a ON a.id=car.activity_id WHERE car.template_id=? ORDER BY a.title", [event.criteria_template_id])) as Array<{criteria_code:string;title:string}>;
 const conduct=(await db.rows("SELECT criteria_code,min_score FROM criteria_conduct_rules WHERE template_id=?", [event.criteria_template_id])) as Array<{criteria_code:string;min_score:number}>;
 const officer=event.type==='officer';
 return <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
  <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
  <CriteriaGroupsPagination totalGroups={groups.length} className="mt-5">{groups.map(group=>{
   const criteria=items.filter(item=>item.group_code===group.code);
   return <div key={group.code} className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-blue-700 bg-blue-50 px-4 py-3"><h3 className="font-semibold text-blue-950">{group.code}. {group.title}</h3><div className="flex flex-wrap gap-3 text-sm font-medium text-blue-900"><span>Yêu cầu: Đạt tối thiểu {Math.max(group.min_required,criteria.filter(item=>Number(item.is_required)===1).length)}/{criteria.length} tiêu chí</span>{officer?<span>Tối đa {group.score_max} điểm</span>:null}</div></div>
    <CriteriaTable containerClassName="rounded-none!" className="criteria-definition-table w-full! min-w-0! table-fixed! [&_th]:whitespace-nowrap! [&_td]:whitespace-normal! [&_td_div]:whitespace-normal! [&_td]:[overflow-wrap:anywhere] [&_td_*]:min-w-0 [&_td_*]:max-w-full [&_tr::before]:w-auto! [&_tr::before]:px-1!">
     <colgroup><col style={{width:"5%"}}/><col style={{width:"8%"}}/><col/><col style={{width:"12%"}}/>{officer?<col style={{width:"12%"}}/>:null}<col style={{width:"34%"}}/></colgroup>
     <thead className="bg-blue-800 text-white"><tr><th className="w-[8%] px-2 py-3 whitespace-nowrap text-sm">Mã</th><th data-column-align="left" className="px-2 py-3 text-left text-sm">Tiêu chí</th><th className="w-[12%] px-2 py-3 whitespace-nowrap text-sm">Bắt buộc</th>{officer?<th className="w-[12%] px-2 py-3 whitespace-nowrap text-sm">Điểm tối đa</th>:null}<th data-column-align="left" className="w-[34%] px-2 py-3 whitespace-nowrap text-left text-sm">Điều kiện đáp ứng</th></tr></thead>
     <tbody className="divide-y divide-slate-100">{criteria.map(item=>{
      const activities=rules.filter(rule=>rule.criteria_code===item.code).map(rule=>rule.title),score=conduct.find(rule=>rule.criteria_code===item.code);
      return <tr key={item.code} className="even:bg-slate-50/60 hover:bg-blue-50/50"><td className="px-2 py-4 text-sm font-medium">{item.code}</td><td data-column-align="left" className="px-2 py-4 text-left text-sm"><div className="whitespace-normal! break-words font-medium text-slate-900">{item.title}</div>{item.description?<div className="mt-1 whitespace-normal! break-words text-slate-500">{item.description}</div>:null}</td><td className="px-2 py-4"><span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold "+(Number(item.is_required)===1?"bg-rose-50 text-rose-700":"bg-slate-100 text-slate-600")}>{Number(item.is_required)===1?"Có":"Không"}</span></td>{officer?<td className="px-2 py-4 text-sm">{item.score_max}</td>:null}<td data-column-align="left" className="px-2 py-4 text-left text-sm text-slate-700"><div className="whitespace-normal! break-words">{activities.length?"Tham gia hoạt động: "+activities.join(", "):null}{activities.length&&score?<br/>:null}{score?"Điểm rèn luyện tối thiểu: "+score.min_score:null}{!activities.length&&!score?"Nộp minh chứng":null}</div></td></tr>;
     })}</tbody>
    </CriteriaTable>
   </div>;
  })}{!groups.length?<p className="text-sm text-slate-500">Chưa có tiêu chuẩn / tiêu chí.</p>:null}</CriteriaGroupsPagination>
 </section>;
}
