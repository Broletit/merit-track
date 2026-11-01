"use client";

import { isValidGmailAddress } from "@/lib/validation/gmail";
import GmailInput from "@/components/common/GmailInput";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import RequiredMark from "@/components/common/RequiredMark";
import ActionFeedback from "@/components/shared/ActionFeedback";
import PasswordChangeSuccess from "@/components/shared/PasswordChangeSuccess";
import { requestResetCode, resetPassword, type ResetState } from "./actions";

const initial:ResetState={ok:false,message:""};
const control="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-blue-600 sm:text-sm";
const button="h-11 w-full rounded-xl bg-blue-900 px-4 font-semibold text-white disabled:opacity-50";

export default function ForgotPasswordForm() {
  const [showRequest,setShowRequest]=useState(true);
  const [account,setAccount]=useState("");
  const [email,setEmail]=useState("");
  const [emailError,setEmailError]=useState("");
  const [code,setCode]=useState("");
  const [challenge,setChallenge]=useState<ResetState|null>(null);
  const [feedback,setFeedback]=useState("");
  const [now,setNow]=useState(()=>Date.now());
  const [,requestAction,requesting]=useActionState(async(previous:ResetState,form:FormData)=>{
    setFeedback("");
    const requestedEmail=String(form.get("email")??"").trim();
    if(!isValidGmailAddress(requestedEmail)){
      setEmailError(requestedEmail?"Gmail không hợp lệ.":"Vui lòng nhập Gmail khôi phục.");
      return {ok:false,message:""};
    }
    setEmailError("");
    const result=await requestResetCode(previous,form);
    if(result.ok){setChallenge(result);setShowRequest(false);setNow(Date.now());setCode("");}
    else setFeedback(result.message);
    return result;
  },initial);
  const [result,resetAction,resetting]=useActionState(async(previous:ResetState,form:FormData)=>{
    setFeedback("");
    const result=await resetPassword(previous,form);
    if(!result.ok)setFeedback(result.message);
    return result;
  },initial);
  useEffect(()=>{
    if(!challenge)return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[challenge]);
  const remaining=Math.max(0,Math.ceil(((challenge?.expiresAt??0)-now)/1000));
  const resendWait=Math.max(0,Math.ceil(((challenge?.resendAt??0)-now)/1000));

  return <div className="mt-6 space-y-5">
    <ActionFeedback pending={requesting||resetting} message={feedback} ok={false}/>
    {result.completed ? <PasswordChangeSuccess/> : showRequest ? <form action={requestAction} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">MSSV<RequiredMark/><input name="account" value={account} onChange={event=>setAccount(event.target.value)} required maxLength={100} autoComplete="username" className={control}/></label>
      <label className="block text-sm font-medium text-slate-700">Gmail đã đăng ký<RequiredMark/><div className="mt-2"><GmailInput value={email} onChange={next=>{setEmail(next);if(emailError)setEmailError(isValidGmailAddress(next)?"":next?"Gmail không hợp lệ.":"Vui lòng nhập Gmail khôi phục.");}} disabled={requesting} error={emailError} invalid={!!emailError}/></div></label>
      <button disabled={requesting} className={button}>{requesting?"Đang gửi mã...":"Gửi mã xác nhận"}</button>
    </form> : <>
      <div role="status" className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-800">
        <p className="break-words">{challenge?.message}</p>
        <p className="mt-1 font-semibold tabular-nums">{remaining>0?`Mã hết hạn sau ${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`:"Mã đã hết hạn. Vui lòng yêu cầu mã mới."}</p>
      </div>
      <form action={resetAction} className="space-y-4">
        <input type="hidden" name="challengeId" value={challenge?.challengeId??""}/>
        <label className="block text-sm font-medium text-slate-700">Mã xác nhận<RequiredMark/><input name="code" value={code} onChange={event=>setCode(event.target.value)} required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={6} className={control}/></label>
        <label className="block text-sm font-medium text-slate-700">Mật khẩu mới<RequiredMark/><input name="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={control}/></label>
        <label className="block text-sm font-medium text-slate-700">Xác nhận mật khẩu<RequiredMark/><input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={control}/></label>
        <button disabled={resetting||requesting||remaining===0} className={button}>{resetting?"Đang cập nhật...":"Đặt lại mật khẩu"}</button>
      </form>
      <form action={requestAction}>
        <input type="hidden" name="account" value={account}/><input type="hidden" name="email" value={email}/>
        <button disabled={requesting||resetting||resendWait>0} className="min-h-11 text-sm font-semibold text-blue-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">{requesting?"Đang gửi mã...":resendWait>0?`Yêu cầu mã mới (${resendWait}s)`:"Yêu cầu mã mới"}</button>
      </form>
    </>}
    {!result.completed&&<Link href="/login" className="block text-center text-sm font-semibold text-blue-800 hover:underline" data-back-link><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>Quay lại đăng nhập</Link>}
  </div>;
}
