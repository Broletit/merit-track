"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import useConfirmation from "@/components/shared/useConfirmation";
import { startCriteriaTemplateEdit } from "@/server/actions/criteria-templates/startCriteriaTemplateEdit";
import { applyCriteriaTemplateEdit } from "@/server/actions/criteria-templates/applyCriteriaTemplateEdit";
import { processCriteriaTemplateEdit } from "@/server/actions/criteria-templates/processCriteriaTemplateEdit";

export default function CriteriaTemplateEditControls({templateId,events,draftStatus}:{templateId:number;events:Array<{id:number;title:string}>;draftStatus:string|null}){
  const router=useRouter();
  const pathname=usePathname();
  const {confirm,modal}=useConfirmation();
  const [pending,startTransition]=useTransition();
  const [processed,setProcessed]=useState(0);
  async function process(){
    let done=false;
    let count=0;
    while(!done){
      const result=await processCriteriaTemplateEdit(templateId);
      count+=result.processed;
      setProcessed(count);
      done=result.done;
    }
    toast.success("Đã cập nhật bộ tiêu chuẩn, hồ sơ và báo cáo.");
    router.replace(pathname,{scroll:false});
    router.refresh();
  }
  function start(){
    startTransition(async()=>{
      try{await startCriteriaTemplateEdit(templateId);router.push(`${pathname}?mode=edit`,{scroll:false});}
      catch(error){toast.error(error instanceof Error?error.message:"Không thể mở bản chỉnh sửa.");}
    });
  }
  async function save(){
    const names=events.map(event=>event.title).join("; ");
    const accepted=await confirm({title:"Xác nhận cập nhật bộ tiêu chuẩn",message:`Các đợt xét sẽ cập nhật: ${names}. Hệ thống sẽ tính lại tiêu chí, điểm và kết quả của cả hồ sơ đã nộp. Bạn có muốn lưu thay đổi?`,confirmLabel:"Lưu thay đổi"});
    if(accepted===null)return;
    startTransition(async()=>{
      try{await applyCriteriaTemplateEdit(templateId);await process();}
      catch(error){toast.error(error instanceof Error?error.message:"Không thể cập nhật bộ tiêu chuẩn. Bạn có thể tiếp tục xử lý trên trang này.");router.refresh();}
    });
  }
  function resume(){
    startTransition(async()=>{
      try{await process();}
      catch(error){toast.error(error instanceof Error?error.message:"Chưa thể hoàn tất cập nhật. Hãy thử lại.");router.refresh();}
    });
  }
  return <>{modal}
    {!draftStatus?<button type="button" onClick={start} disabled={pending}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-60">
      <Pencil size={16}/>{pending?"Đang mở...":"Chỉnh sửa"}
    </button>:<button type="button" onClick={draftStatus==="processing"?resume:save} disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
      {pending?`Đang xử lý${processed?` ${processed} bản ghi`:""}...`:draftStatus==="processing"?"Tiếp tục cập nhật":"Lưu thay đổi"}
    </button>}
  </>;
}
