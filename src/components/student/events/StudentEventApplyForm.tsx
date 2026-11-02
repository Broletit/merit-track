import type { StudentEventCriteriaItem } from "./types";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";
import { AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
export default function StudentEventApplyForm({criteria}:{eventId:number;criteria:StudentEventCriteriaItem[];canSubmit:boolean}) {
 const groups=Array.from(new Map(criteria.map(item=>[item.groupCode,item.groupTitle])).entries());
 return <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
  <h2 className="text-xl font-semibold text-slate-900">Tiêu chuẩn / tiêu chí</h2>
  <CriteriaGroupsPagination totalGroups={groups.length} className="mt-5">{groups.map(([code,title])=>{
   const items=criteria.filter(item=>item.groupCode===code);
   return <div key={code} className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-blue-700 bg-blue-50 px-4 py-3"><h3 className="font-semibold text-blue-950">{code}. {title}</h3><span className="text-sm font-medium text-blue-900">Yêu cầu: Đạt tối thiểu {Math.max(Number(items[0]?.minRequired ?? 0),items.filter(item=>item.isRequired).length)}/{items.length} tiêu chí</span></div>
    <CriteriaTable containerClassName="rounded-none!" style={{width:"60rem",minWidth:"60rem",tableLayout:"auto"}} className="event-criteria-table [&_th]:whitespace-nowrap! [&_td]:whitespace-normal! [&_td_div]:whitespace-normal! [&_td]:[overflow-wrap:anywhere]">
     <colgroup><col style={{width:"4rem",minWidth:"4rem"}}/><col style={{width:"5rem",minWidth:"5rem"}}/><col/><col style={{width:"8rem",minWidth:"8rem"}}/><col style={{width:"13rem",minWidth:"13rem"}}/></colgroup>
     <thead className="bg-blue-800 text-white"><tr><th className="px-2 py-3 whitespace-nowrap text-sm">STT</th><th className="px-2 py-3 whitespace-nowrap text-sm">Mã</th><th data-column-align="left" className="px-2 py-3 text-left text-sm">Tiêu chí</th><th className="px-2 py-3 whitespace-nowrap text-sm">Bắt buộc</th><th className="px-2 py-3 whitespace-nowrap text-sm">Trạng thái</th></tr></thead>
     <tbody className="divide-y divide-slate-100">{items.map((item,index)=><tr key={item.code} className="even:bg-slate-50/60 hover:bg-blue-50/50">
      <td className="px-2 py-4 whitespace-nowrap text-sm font-medium">{index+1}</td><td className="px-2 py-4 whitespace-nowrap text-sm font-medium">{item.code}</td>
      <td data-column-align="left" className="px-2 py-4 text-left text-sm"><div className="whitespace-normal! break-words font-medium text-slate-900">{item.title}</div>{item.description?<div className="mt-1 whitespace-normal! break-words text-slate-500">{item.description}</div>:null}{item.autoPassed?<div className="[&_*]:whitespace-normal! [&_*]:break-words"><AutoCriteriaMessage message={item.autoMessage}/></div>:null}</td>
      <td className="px-2 py-4"><span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold "+(item.isRequired?"bg-rose-50 text-rose-700":"bg-slate-100 text-slate-600")}>{item.isRequired?"Có":"Không"}</span></td>
      
      <td className="px-2 py-4"><span className={"inline-flex max-w-full whitespace-nowrap! rounded-full px-3 py-1 text-xs font-semibold "+(item.autoPassed?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700")}>{item.autoPassed?"Đã đạt":"Cần nộp minh chứng"}</span></td>
     </tr>)}</tbody>
    </CriteriaTable>
   </div>;
  })}{!criteria.length?<p className="text-sm text-slate-500">Đợt xét này chưa có tiêu chuẩn / tiêu chí.</p>:null}</CriteriaGroupsPagination>
 </section>;
}
