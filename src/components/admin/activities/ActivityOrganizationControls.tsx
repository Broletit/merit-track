"use client";
import RequiredMark from "@/components/common/RequiredMark";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import useCohorts from "@/components/shared/useCohorts";
import type { ActivityClassOption } from "./types";

export default function ActivityOrganizationControls({classes,defaultLevel="class",defaultClassIds=[],defaultCohorts=[],errorField}: {classes:ActivityClassOption[];defaultLevel?:string;defaultClassIds?:number[];defaultCohorts?:number[];errorField?:string}) {
 const {cohorts}=useCohorts();
 const [level,setLevel]=useState(defaultLevel === "faculty" ? "faculty" : "class");
 const [selected,setSelected]=useState<number[]>(()=>Array.from(new Set([...defaultCohorts,...classes.filter(item=>defaultClassIds.includes(item.id)&&item.cohort).map(item=>item.cohort!)])));
 const [ids,setIds]=useState<number[]>(defaultClassIds);
 const [open,setOpen]=useState(false);
 const dropdown=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  function outside(event:PointerEvent){if(!dropdown.current?.contains(event.target as Node))setOpen(false);}
  function escape(event:KeyboardEvent){if(event.key==="Escape")setOpen(false);}
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
  return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[]);
 return <section className="min-w-0 max-w-full rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
  <h2 className="text-lg font-semibold text-slate-900">Tổ chức hoạt động</h2>
  <input type="hidden" name="participationSource" value={level==="class"?"internal":"external"}/>
  <input type="hidden" name="scopeMode" value={level==="class"?"selected":"all"}/>
  {level==="class"&&ids.map(id=><input key={id} type="hidden" name="classIds" value={id}/>)}
  {level==="class"&&selected.filter(cohort=>!classes.some(item=>item.cohort===cohort&&ids.includes(item.id))).map(cohort=><input key={cohort} type="hidden" name="cohorts" value={cohort}/>)}
  <div className="mt-4 grid grid-cols-2 items-start gap-3">
   <label className="flex min-w-0 flex-col text-sm font-medium text-slate-600"><span>Cấp tổ chức<RequiredMark required={true}/></span><select name="organizerLevel" required value={level} onChange={event=>{setLevel(event.target.value);setOpen(false);}} className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="class">Chi đoàn</option><option value="faculty">Cấp khoa</option></select></label>
   {level==="class"?<div ref={dropdown} className="relative min-w-0 text-sm font-medium text-slate-600"><span id="activity-cohort-label" className="block">Khóa<RequiredMark/></span><button type="button" aria-labelledby="activity-cohort-label activity-cohort-value" aria-expanded={open} aria-controls="activity-cohort-options" onClick={()=>setOpen(!open)} className="mt-2 flex min-h-11 h-auto w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left py-2 max-w-full break-words"><span id="activity-cohort-value" className="truncate">{selected.length?selected.map(item=>"Khóa "+item).join(", "):"Chọn khóa"}</span>{open?<ChevronUp size={16} className="shrink-0"/>:<ChevronDown size={16} className="shrink-0"/>}</button>{open?<div id="activity-cohort-options" className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{cohorts.map(cohort=><label key={cohort} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-blue-50"><input type="checkbox" checked={selected.includes(cohort)} onChange={event=>{setSelected(current=>event.target.checked?[...current,cohort].sort((a,b)=>a-b):current.filter(item=>item!==cohort));if(!event.target.checked)setIds(current=>current.filter(id=>classes.find(item=>item.id===id)?.cohort!==cohort));}}/>Khóa {cohort}</label>)}</div>:null}</div>:null}
  </div>
  {level==="class"&&selected.map(cohort=>{
   const group=classes.filter(item=>item.cohort===cohort);
   if(!group.length)return null;
   const all=group.every(item=>ids.includes(item.id));
   return <div key={cohort} className="mt-3 min-w-0 rounded-none border border-slate-200 px-3 py-2" data-invalid={errorField==="classIds"}>
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-slate-700">Chọn chi đoàn · Khóa {cohort}</h3><button type="button" onClick={()=>setIds(current=>all?current.filter(id=>!group.some(item=>item.id===id)):Array.from(new Set([...current,...group.map(item=>item.id)])))} className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50">{all?"Bỏ chọn tất cả":"Chọn tất cả"}</button></div>
    <div className="flex max-w-full flex-wrap gap-2 pb-1">{group.map(item=><label key={item.id} className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-sm"><input type="checkbox" checked={ids.includes(item.id)} onChange={event=>setIds(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}/>{item.code}</label>)}</div>
   </div>;
  })}
 </section>;
}
