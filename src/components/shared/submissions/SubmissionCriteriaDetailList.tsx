"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
import CriteriaReviewDecision from "./CriteriaReviewDecision";
import SubmissionEvidenceLinks from "./SubmissionEvidenceLinks";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";
import TableResultsFooter from "@/components/common/TableResultsFooter";
import { scrollToTable } from "@/lib/ui/scrollToTable";

type CriteriaItem = { code:string; title:string; description:string|null; group_code:string; group_title:string; min_required?:number; evidence_type:string; is_required:number; auto_passed:number|null; auto_message:string|null; content_text:string|null; file_count:number; review_decision?:string|null; evidence_files?:Array<{id:number;fileName:string;mimeType:string}>; group_score_max?:number; score_max?:number; auto_score?:number; matched_activity_titles?:string|null };

function status(item: CriteriaItem) {
  if (Number(item.auto_passed) === 1 || item.review_decision === "pass") return "Đã đạt";
  if (item.review_decision === "fail") return "Chưa đạt";
  return String(item.content_text ?? "").trim() || Number(item.file_count) ? "Chờ đánh giá" : "Cần bổ sung minh chứng";
}
function statusClass(value:string) {
  if (value === "Đã đạt") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value === "Chưa đạt") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (value === "Chờ đánh giá") return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function CriteriaGroup({ code,title,items,submissionId,canReview }:{code:string;title:string;items:CriteriaItem[];submissionId?:number;canReview:boolean}) {
  const pageSize=5;
  const [requestedPage,setRequestedPage]=useState(1);
  const anchor=useRef<HTMLDivElement>(null);
  const lastPage=useRef(1);
  const pages=Math.max(1,Math.ceil(items.length/pageSize));
  const page=Math.min(requestedPage,pages);
  const visible=items.slice((page-1)*pageSize,page*pageSize);
  const hasScores=items.some((item)=>Number(item.score_max)>0);
  const minimum=Math.max(Number(items[0]?.min_required??0),items.filter((item)=>Number(item.is_required)===1).length);
  const passed=items.filter((item)=>status(item)==="Đã đạt");
  const maxScore=Number(items[0]?.group_score_max)||items.reduce((sum,item)=>sum+Number(item.score_max??0),0);
  const awarded=Math.min(maxScore,passed.reduce((sum,item)=>sum+(Number(item.auto_passed)===1?Math.min(Number(item.score_max??0),Number(item.auto_score)||Number(item.score_max??0)):Number(item.score_max??0)),0));
  useLayoutEffect(()=>{ if(page===lastPage.current)return; lastPage.current=page; if(anchor.current)scrollToTable(anchor.current); },[page]);
  return <div ref={anchor} data-pagination-scroll-target className="min-w-0 space-y-2 scroll-mt-4 [&_[data-table-results-footer]]:py-2">
    <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-blue-700 bg-blue-50 px-4 py-3">
      <h3 className="font-semibold text-blue-950">{code}. {title}</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="font-medium text-blue-900">Yêu cầu: Đạt tối thiểu {minimum}/{items.length} tiêu chí</span><span className="font-semibold text-emerald-700">{hasScores?`Đã đạt ${awarded}/${maxScore} điểm`:`Đã đạt ${passed.length}/${items.length} tiêu chí`}</span></div>
    </div>
    <CriteriaTable containerClassName="rounded-none!" style={{width:"78rem",minWidth:"78rem",tableLayout:"auto"}} className="criteria-detail-table [&_th]:whitespace-nowrap! [&_td]:whitespace-normal! [&_td_div]:whitespace-normal! [&_td]:[overflow-wrap:anywhere] [&_tr::before]:px-1! [&_tr::before]:w-auto!">
      <colgroup><col style={{width:"4rem",minWidth:"4rem"}}/><col style={{width:"4.5rem",minWidth:"4.5rem"}}/><col style={{width:"22rem",minWidth:"22rem"}}/><col style={{width:"7.5rem",minWidth:"7.5rem"}}/>{hasScores?<col style={{width:"7rem",minWidth:"7rem"}}/>:null}<col style={{width:"14rem",minWidth:"14rem"}}/><col style={{width:"11rem",minWidth:"11rem"}}/>{submissionId?<col style={{width:"11rem",minWidth:"11rem"}}/>:null}</colgroup>
      <thead className="bg-blue-800 text-white"><tr><th className="px-2 py-3 text-sm">STT</th><th className="px-2 py-3 text-sm">Mã</th><th data-column-align="left" className="px-2 py-3 text-left text-sm">Tiêu chí</th><th className="px-2 py-3 text-sm">Bắt buộc</th>{hasScores?<th className="px-2 py-3 text-sm">Điểm tối đa</th>:null}<th className="px-2 py-3 text-sm">Trạng thái</th><th className="px-2 py-3 text-sm">Minh chứng</th>{submissionId?<th className="px-2 py-3 text-sm">Đánh giá</th>:null}</tr></thead>
      <tbody className="divide-y divide-slate-100">{visible.map((item,index)=>{const value=status(item);const canDecide=Number(item.auto_passed)!==1&&(Boolean(item.content_text?.trim())||Number(item.file_count)>0);return <tr key={item.code} className="even:bg-slate-50/60 hover:bg-blue-50/50"><td className="px-2 py-4 text-sm">{(page-1)*pageSize+index+1}</td><td data-label="Mã" className="px-2 py-4 text-sm font-medium">{item.code}</td><td data-label="Tiêu chí" data-column-align="left" className="px-2 py-4 text-left text-sm"><div className="break-words font-medium text-slate-900">{item.title}</div>{item.description?<div className="mt-1 break-words text-slate-500">{item.description}</div>:null}{item.auto_message?<div className="[&_*]:break-words"><AutoCriteriaMessage message={item.auto_message} matchedActivityTitles={item.matched_activity_titles}/></div>:null}</td><td data-label="Bắt buộc" className="px-2 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${Number(item.is_required)===1?"bg-rose-50 text-rose-700":"bg-slate-100 text-slate-600"}`}>{Number(item.is_required)===1?"Có":"Không"}</span></td>{hasScores?<td data-label="Điểm tối đa" className="px-2 py-4 text-sm">{Number(item.score_max??0)}</td>:null}<td data-label="Trạng thái" className="px-2 py-4"><span className={`criteria-status-label inline-flex max-w-full whitespace-normal break-words rounded-full px-3 py-1 text-center text-xs font-semibold leading-5 ring-1 ${statusClass(value)}`}>{value}</span></td><td data-label="Minh chứng" className="px-2 py-4"><SubmissionEvidenceLinks files={item.evidence_files??[]} content={item.content_text}/></td>{submissionId?<td data-label="Đánh giá" className="px-2 py-4">{canDecide?<CriteriaReviewDecision submissionId={submissionId} criteriaCode={item.code} decision={item.review_decision??null} disabled={!canReview}/>:<span className="text-slate-400">—</span>}</td>:null}</tr>;})}</tbody>
    </CriteriaTable>
    {items.length>pageSize?<TableResultsFooter totalResults={items.length} resultLabel="tiêu chí"><button type="button" aria-label="Trang trước" disabled={page<=1} onClick={()=>setRequestedPage(page-1)} className="inline-flex h-10 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300 sm:w-10">‹</button><span className="whitespace-nowrap text-xs text-slate-500 sm:text-sm">Trang {page}/{pages}</span><button type="button" aria-label="Trang sau" disabled={page>=pages} onClick={()=>setRequestedPage(page+1)} className="inline-flex h-10 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300 sm:w-10">›</button></TableResultsFooter>:null}
  </div>;
}

export default function SubmissionCriteriaDetailList({items,submissionId,canReview=false,reviewHref,canOpenReview=false,headerAction}:{items:CriteriaItem[];submissionId?:number;canReview?:boolean;reviewHref?:string;canOpenReview?:boolean;headerAction?:ReactNode}) {
  const groups=Array.from(new Map(items.map((item)=>[item.group_code,item.group_title])).entries());
  return <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-100 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-900">Chi tiết tiêu chí hồ sơ</h2>{headerAction}{reviewHref?(canOpenReview?<Link href={reviewHref} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Duyệt hồ sơ</Link>:<button type="button" disabled className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-300">Duyệt hồ sơ</button>):null}</div>
    <CriteriaGroupsPagination totalGroups={groups.length} className="mt-4 [&>[data-table-results-footer]]:py-2">{groups.map(([code,title])=><CriteriaGroup key={code} code={code} title={title} items={items.filter((item)=>item.group_code===code)} submissionId={submissionId} canReview={canReview}/>)}{!items.length?<p className="text-sm text-slate-500">Chưa có tiêu chí.</p>:null}</CriteriaGroupsPagination>
  </section>;
}
