"use client";
import FieldError from "@/components/common/FieldError";

import { useId } from "react";
import { gmailAddressFromInput, gmailUsername } from "@/lib/validation/gmail";
type Props = { id?:string; value:string; onChange:(value:string)=>void; disabled?:boolean; invalid?:boolean; error?:string; describedBy?:string };
export default function GmailInput({id,value,onChange,disabled,invalid,error,describedBy}:Props) {
 const generatedId=useId();
 const errorId=(id??generatedId)+"-validation-error";
 const visibleError=error;
 return <div className="min-w-0"><div className={"flex h-11 min-w-0 overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-blue-500/20 " + (invalid||visibleError?"border-red-500":"border-slate-300 focus-within:border-blue-600")}>
 <input id={id} type="text" aria-required="true" maxLength={30} value={gmailUsername(value)}
 onChange={event=>{
 const next=gmailAddressFromInput(event.target.value);
 onChange(next);
 }}
 autoComplete="off" autoCapitalize="none" spellCheck={false}
 disabled={disabled} aria-invalid={!!(invalid||visibleError)||undefined} aria-describedby={[describedBy,visibleError?errorId:undefined].filter(Boolean).join(" ")||undefined}
 className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-base text-slate-900 outline-none sm:text-sm"/>
 <span className="flex shrink-0 items-center border-l border-slate-200 bg-slate-50 px-2 text-sm font-medium text-slate-600 sm:px-3">@gmail.com</span>
 <input type="hidden" name="email" value={value}/>
 </div>
 <FieldError id={errorId} message={visibleError} />
 </div>;
}

