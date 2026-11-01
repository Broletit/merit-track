"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Mail, Save } from "lucide-react";
import GmailInput from "@/components/common/GmailInput";
import { isValidGmailAddress } from "@/lib/validation/gmail";
import RequiredMark from "@/components/common/RequiredMark";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { updateProfileEmail, type ProfileEmailState } from "@/server/actions/profile/updateProfileEmail";

const initial:ProfileEmailState={ok:false,message:""};

export default function ProfileEmailForm({email}:{email:string|null}) {
  const router=useRouter();
  const [value,setValue]=useState(email??"");
  const [edited,setEdited]=useState(false);
  const [state,action,pending]=useActionState(async(previous:ProfileEmailState,form:FormData)=>{
    setEdited(false);
    const result=await updateProfileEmail(previous,form);
    if(result.ok){setValue(result.email??"");router.refresh();}
    return result;
  },initial);
  const fieldError=edited?undefined:state.fieldError;
  const missing=!isValidGmailAddress(email);
  const unchanged=value.trim().toLowerCase()===(email??"").trim().toLowerCase();

  return <form action={action} className="mt-5 min-w-0 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
    <ActionFeedback pending={pending} message={state.message} ok={state.ok}/>
    <label htmlFor="profile-email" className="flex items-center gap-2 text-sm font-semibold text-slate-800">
      <Mail size={16} aria-hidden="true" className="text-blue-800"/>Gmail<RequiredMark/>
      {missing&&<CircleAlert size={16} aria-label="Chưa có email khôi phục" className="text-red-600"/>}
    </label>
    <div className="mt-2 flex min-w-0 flex-col items-start gap-3 sm:flex-row">
      <div className="w-full min-w-0 flex-1">
        <GmailInput id="profile-email" value={value} onChange={next=>{setValue(next);setEdited(true);}} disabled={pending} invalid={!!fieldError} error={fieldError} describedBy="profile-email-hint"/>
      </div>
      <button type="submit" disabled={pending||unchanged} className="inline-flex min-h-11 h-auto w-full shrink-0 items-center justify-center gap-2 whitespace-normal rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto py-2 max-w-full break-words"><Save size={16}/>{pending?"Đang lưu...":"Lưu Gmail"}</button>
    </div>
    <p id="profile-email-hint" className={`mt-2 text-xs leading-5 ${missing?"text-red-600":"text-slate-500"}`}>{missing?"Bạn chưa có Gmail khôi phục hợp lệ. Vui lòng cập nhật để có thể lấy lại mật khẩu khi cần.":"Gmail này được dùng để nhận mã khôi phục mật khẩu."}</p>
  </form>;
}
