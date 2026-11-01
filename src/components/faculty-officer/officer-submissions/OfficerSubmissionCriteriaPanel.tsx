"use client";
import {useState,type ComponentProps} from "react";
import {Pencil,SquareX} from "lucide-react";
import SubmissionCriteriaDetailList from "@/components/shared/submissions/SubmissionCriteriaDetailList";
import OfficerSubmissionEvidenceForm from "./OfficerSubmissionEvidenceForm";
type Item=ComponentProps<typeof OfficerSubmissionEvidenceForm>["items"][number] & ComponentProps<typeof SubmissionCriteriaDetailList>["items"][number];
export default function OfficerSubmissionCriteriaPanel({submissionId,canEdit,items}:{submissionId:number;canEdit:boolean;items:Item[]}){
 const [editing,setEditing]=useState(false);
 if(editing&&canEdit)return <div className="relative"><button type="button" onClick={()=>setEditing(false)} aria-label="Đóng chỉnh sửa minh chứng" title="Đóng" className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6 inline-flex h-10! w-10! min-h-10! min-w-10! shrink-0 items-center justify-center rounded-md! border-0! bg-transparent! p-0! text-red-500! shadow-none! transition-colors hover:bg-red-50! hover:text-red-700! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"><SquareX size={24} strokeWidth={1.75}/></button><OfficerSubmissionEvidenceForm submissionId={submissionId} canEdit={canEdit} items={items}/></div>;
 return <SubmissionCriteriaDetailList items={items} headerAction={canEdit?<button type="button" onClick={()=>setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil size={15}/>Cập nhật minh chứng</button>:null}/>;
}
