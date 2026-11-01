import type {ReactNode} from "react";
type CriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required?: number;
  evidence_type: string;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_count: number;
  review_decision?: string | null;
  evidence_files?: Array<{ id: number; fileName: string; mimeType: string }>;
  group_score_max?: number;
  score_max?: number;
  auto_score?: number;
  matched_activity_titles?: string | null;
};

import {AutoCriteriaMessage} from "@/components/shared/criteria/AutoCriteriaAchievement";
import CriteriaReviewDecision from "./CriteriaReviewDecision";
import SubmissionEvidenceLinks from "./SubmissionEvidenceLinks";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";
import Link from "next/link";
function getStatus(item: CriteriaItem) {
  const autoPassed = Number(item.auto_passed ?? 0) === 1;
  const hasContent = String(item.content_text ?? "").trim().length > 0;
  const hasFile = Number(item.file_count ?? 0) > 0;

  if (autoPassed) return "Đã đạt";
  if (item.review_decision === "pass") return "Đã đạt";
  if (item.review_decision === "fail") return "Chưa đạt";
  if (hasContent || hasFile) return "Chờ đánh giá";
  return "Cần bổ sung minh chứng";
}

function getStatusClass(label: string) {
if (label === "Chờ đánh giá") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (label === "Đã đạt") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (label === "Chưa đạt") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-amber-50 text-amber-700 ring-amber-100";
}


export default function SubmissionCriteriaDetailList({items,submissionId,canReview=false,reviewHref,canOpenReview=false,headerAction}:{items:CriteriaItem[];submissionId?:number;canReview?:boolean;reviewHref?:string;canOpenReview?:boolean;headerAction?:ReactNode}){
 const groups=Array.from(new Map(items.map(item=>[item.group_code,item.group_title])).entries());
 return <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-900">Chi tiết tiêu chí hồ sơ</h2>{headerAction}{reviewHref?(canOpenReview?<Link href={reviewHref} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Duyệt hồ sơ</Link>:<button type="button" disabled className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-300">Duyệt hồ sơ</button>):null}</div>
  <CriteriaGroupsPagination totalGroups={groups.length} className="mt-5">{groups.map(([code,title])=>{
   const groupItems=items.filter(item=>item.group_code===code);
   const hasScores=groupItems.some(item=>Number(item.score_max)>0);
   const maximum=Number(groupItems[0]?.group_score_max)||groupItems.reduce((sum,item)=>sum+Number(item.score_max??0),0);
   const passed=groupItems.filter(item=>getStatus(item)==="Đã đạt");
   const awarded=Math.min(maximum,passed.reduce((sum,item)=>sum+(Number(item.auto_passed)===1?Math.min(Number(item.score_max??0),Number(item.auto_score)||Number(item.score_max??0)):Number(item.score_max??0)),0));
   return <div key={code} className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-blue-700 bg-blue-50 px-4 py-3"><h3 className="font-semibold text-blue-950">{code}. {title}</h3><div className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="font-medium text-blue-900">Yêu cầu: Đạt tối thiểu {Math.max(Number(groupItems[0]?.min_required??0),groupItems.filter(item=>Number(item.is_required)===1).length)}/{groupItems.length} tiêu chí</span><span className="font-semibold text-emerald-700">{hasScores?"Đã đạt "+awarded+"/"+maximum+" điểm":"Đã đạt "+passed.length+"/"+groupItems.length+" tiêu chí"}</span></div></div>
    <CriteriaTable containerClassName="rounded-none!" className="criteria-detail-table w-full! min-w-0! table-fixed! [&_th]:whitespace-nowrap! [&_td]:whitespace-normal! [&_td_div]:whitespace-normal! [&_td]:[overflow-wrap:anywhere] [&_td_*]:min-w-0 [&_td_*]:max-w-full [&_tr::before]:px-1! [&_tr::before]:w-auto!">
     <colgroup><col style={{width:"5%"}}/><col style={{width:"7%"}}/><col/><col style={{width:"10%"}}/>{hasScores?<col style={{width:"8%"}}/>:null}<col style={{width:"20%"}}/><col style={{width:"15%"}}/>{submissionId?<col style={{width:"18%"}}/>:null}</colgroup>
     <thead className="bg-blue-800 text-white"><tr><th className="w-[7%] px-2 py-3 whitespace-nowrap text-sm">Mã</th><th data-column-align="left" className="px-2 py-3 text-left text-sm">Tiêu chí</th><th className="w-[10%] px-2 py-3 whitespace-nowrap text-sm">Bắt buộc</th>{hasScores?<th className="w-[9%] px-2 py-3 whitespace-nowrap text-sm">Điểm tối đa</th>:null}<th className="w-[18%] px-2 py-3 whitespace-nowrap text-sm">Trạng thái</th><th className="w-[15%] px-2 py-3 whitespace-nowrap text-sm">Minh chứng</th>{submissionId?<th className="w-[18%] px-2 py-3 whitespace-nowrap text-sm">Đánh giá</th>:null}</tr></thead>
     <tbody className="divide-y divide-slate-100">{groupItems.map(item=>{const label=getStatus(item);return <tr key={item.code} className="even:bg-slate-50/60 hover:bg-blue-50/50">
      <td data-label="Mã" className="px-2 py-4 text-sm font-medium">{item.code}</td>
      <td data-label="Tiêu chí" data-column-align="left" className="px-2 py-4 text-left text-sm"><div className="whitespace-normal! break-words font-medium text-slate-900">{item.title}</div>{item.description?<div className="mt-1 whitespace-normal! break-words text-slate-500">{item.description}</div>:null}{item.auto_message?<div className="[&_*]:whitespace-normal! [&_*]:break-words"><AutoCriteriaMessage message={item.auto_message} matchedActivityTitles={item.matched_activity_titles}/></div>:null}</td>
      <td data-label="Bắt buộc" className="px-2 py-4"><span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold "+(Number(item.is_required)===1?"bg-rose-50 text-rose-700":"bg-slate-100 text-slate-600")}>{Number(item.is_required)===1?"Có":"Không"}</span></td>
      {hasScores?<td data-label="Điểm tối đa" className="px-2 py-4 text-sm">{Number(item.score_max??0)}</td>:null}
      <td data-label="Trạng thái" className="px-2 py-4"><span className={"inline-flex max-w-full whitespace-nowrap! rounded-full px-3 py-1 text-xs font-semibold ring-1 "+getStatusClass(label)}>{label}</span></td>
      <td data-label="Minh chứng" className="px-2 py-4"><SubmissionEvidenceLinks files={item.evidence_files??[]} content={item.content_text}/></td>
      {submissionId?<td data-label="Đánh giá" className="px-2 py-4">{Number(item.auto_passed)!==1&&(Boolean(item.content_text?.trim())||Number(item.file_count)>0)?<CriteriaReviewDecision submissionId={submissionId} criteriaCode={item.code} decision={item.review_decision??null} disabled={!canReview}/>:<span className="text-slate-400">—</span>}</td>:null}
     </tr>;})}</tbody>
    </CriteriaTable>
   </div>;
  })}{!items.length?<p className="text-sm text-slate-500">Chưa có tiêu chí.</p>:null}</CriteriaGroupsPagination>
 </section>;
}
