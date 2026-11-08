"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewSubmissionCriterion } from "@/server/actions/reviews/reviewSubmissionCriterion";

export default function CriteriaReviewDecision({ submissionId, criteriaCode, decision, disabled }: { submissionId:number; criteriaCode:string; decision:string|null; disabled:boolean }) {
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [error,setError]=useState("");
  function update(value:"pass"|"fail") {
    setError("");
    startTransition(async()=>{
      try {
        await reviewSubmissionCriterion(submissionId,criteriaCode,value,value==="pass"?1:0);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không thể cập nhật đánh giá.");
      }
    });
  }
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={disabled||pending} onClick={()=>update("pass")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${decision==="pass"?"bg-emerald-600! text-white!":"bg-white! text-emerald-700! ring-1 ring-emerald-200"} disabled:opacity-50`}>Đạt</button>
    <button type="button" disabled={disabled||pending} onClick={()=>update("fail")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${decision==="fail"?"bg-rose-600! text-white!":"bg-white! text-rose-700! ring-1 ring-rose-200"} disabled:opacity-50`}>{pending?"Đang lưu...":"Chưa đạt"}</button>
    {error?<p className="w-full text-xs font-medium text-rose-700">{error}</p>:null}
  </div>;
}
