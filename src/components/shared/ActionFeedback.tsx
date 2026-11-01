"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

export default function ActionFeedback({pending=false,message="",ok=false,neutral=false,colored=false}:{pending?:boolean;message?:string;ok?:boolean;neutral?:boolean;colored?:boolean}){
  const feedbackId=useId();
  useEffect(()=>{
    if(pending||!message)return;
    const toastId=`action-feedback-${feedbackId}`;
    if(neutral)toast(message,{id:toastId,icon:"ℹ️"});
    else if(ok)toast.success(message,{id:toastId,...(colored?{style:{background:"#ecfdf5",color:"#047857"},iconTheme:{primary:"#059669",secondary:"#ffffff"}}:{})});
    else{
      const event = new CustomEvent("app:action-error", { detail: { message }, cancelable: true });
      if (!window.dispatchEvent(event)) return;
      toast.error(message,{id:toastId,...(colored?{style:{background:"#fff1f2",color:"#be123c"},iconTheme:{primary:"#e11d48",secondary:"#ffffff"}}:{})});
    }
  },[feedbackId,message,neutral,ok,pending,colored]);

  if(!pending||typeof document==="undefined")return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-sky-100/90 shadow-[0_1px_6px_rgba(14,165,233,0.3)]" role="status" aria-label="Đang xử lý">
      <div className="top-loading-gradient h-full w-[38%]" />
    </div>,
    document.body,
  );
}
