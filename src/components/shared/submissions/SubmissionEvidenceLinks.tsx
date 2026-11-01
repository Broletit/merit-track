"use client";
import {useEffect,useRef,useState} from "react";
import {SquareX} from "lucide-react";
import {preserveDialogScroll} from "@/lib/ui/dialogScroll";
export default function SubmissionEvidenceLinks({files=[],content}:{files?:Array<{id:number;fileName:string}>;content?:string|null}){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{preserveDialogScroll(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();if(!open)dialog.current?.close();});},[open]);
 const link="h-auto! min-h-0! border-0! bg-transparent! p-0! rounded-none! text-sm! font-medium! text-blue-700! whitespace-normal! break-words underline underline-offset-2";
 return <div className="flex flex-col items-center gap-2">
  {content?.trim()?<button type="button" onClick={()=>setOpen(true)} className={link}>Xem nội dung</button>:null}
  {files.map((file,index)=><a key={file.id} href={"/api/submissions/files/"+file.id} target="_blank" rel="noopener noreferrer" title={file.fileName} className={link}>{files.length===1?"Xem minh chứng":"Minh chứng "+(index+1)}</a>)}
  {!content?.trim()&&!files.length?<span className="text-slate-400">—</span>:null}
  <dialog ref={dialog} aria-label="Nội dung minh chứng" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border-0 bg-white p-5 shadow-xl backdrop:bg-slate-900/50">
   <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Nội dung minh chứng</h3><button type="button" onClick={()=>setOpen(false)} aria-label="Đóng minh chứng" className="inline-flex h-10! w-10! min-h-10! min-w-10! shrink-0 items-center justify-center rounded-md! border-0! bg-transparent! p-0! text-red-500! shadow-none! transition-colors hover:bg-red-50! hover:text-red-700! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"><SquareX size={24} strokeWidth={1.75}/></button></div>
   <div className="mt-4 max-h-[65dvh] overflow-y-auto whitespace-pre-wrap! break-words text-left text-sm text-slate-700">{content}</div>
  </dialog>
 </div>;
}
