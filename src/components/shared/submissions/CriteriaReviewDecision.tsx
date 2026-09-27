"use client";

import { useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewSubmissionCriterion } from "@/server/actions/reviews/reviewSubmissionCriterion";

export default function CriteriaReviewDecision({submissionId,criteriaCode,decision,disabled}:{submissionId:number;criteriaCode:string;decision:string|null;disabled:boolean}){
  const router=useRouter();const[pending,startTransition]=useTransition();const[error,setError]=useState("");
  function update(value:"pass"|"fail"){setError("");startTransition(async()=>{try{await reviewSubmissionCriterion(submissionId,criteriaCode,value);router.refresh();}catch(e){setError(e instanceof Error?e.message:"Không thể cập nhật.");}})}
  return <div className="mt-3"><div className="flex flex-wrap gap-2">
    <button type="button" disabled={disabled||pending} onClick={()=>update("pass")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${decision==="pass"?"bg-emerald-600 text-white":"bg-white text-emerald-700 ring-1 ring-emerald-200"} disabled:opacity-50`}>Đạt</button>
    <button type="button" disabled={disabled||pending} onClick={()=>update("fail")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${decision==="fail"?"bg-rose-600 text-white":"bg-white text-rose-700 ring-1 ring-rose-200"} disabled:opacity-50`}>Chưa đạt</button>
  </div>{error?<p className="mt-2 text-xs font-medium text-rose-700">{error}</p>:null}</div>;
}
