"use client";
import CohortFilter from "@/components/shared/CohortFilter";
import FilterRow from "@/components/shared/filters/FilterRow";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
type Option = { id: number; title?: string; code?: string };
export default function SubmissionReportTableFilter({ mode, events, classes }: { mode: "potential" | "participant"; events: Option[]; classes: Option[] }) {
  const router=useRouter(),pathname=usePathname(),searchParams=useSearchParams();
  const [keyword,setKeyword]=useState(searchParams.get("keyword")??"");
  function update(key:string,value:string){const params=new URLSearchParams(searchParams.toString());if(value)params.set(key,value);else params.delete(key);params.set("tab","tables");params.set("potentialPage","1");params.set("participantPage","1");router.replace(`${pathname}?${params.toString()}`,{scroll:false});}
  useEffect(()=>{const timer=setTimeout(()=>update("keyword",keyword.trim()),350);return()=>clearTimeout(timer);// eslint-disable-next-line react-hooks/exhaustive-deps
  },[keyword]);
  const stateKey=mode==="potential"?"potentialStatus":"participantStatus";
  const inputClass="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500";
  return <FilterRow className={`report-filter-spacious grid gap-4 ${mode==="potential"?"xl:grid-cols-6":"xl:grid-cols-5"}`}>
    <div className="filter-field"><label>Tìm kiếm</label><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={keyword} onChange={event=>setKeyword(event.target.value)} placeholder="Tên hoặc MSSV" className={`${inputClass} pl-9`}/></div></div>
    <div className="filter-field"><label>Khóa</label><CohortFilter/></div>
    <div className="filter-field"><label>Lớp</label><select value={searchParams.get("classId")??""} onChange={event=>update("classId",event.target.value)} className={inputClass}><option value="">Tất cả lớp</option>{classes.map(item=><option key={item.id} value={item.id}>{item.code}</option>)}</select></div>
    <div className="filter-field"><label>Đợt xét</label><select value={searchParams.get("eventId")??""} onChange={event=>update("eventId",event.target.value)} className={inputClass}><option value="">Tất cả đợt xét</option>{events.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    <div className="filter-field"><label>{mode==="potential"?"Đánh giá":"Trạng thái"}</label><select value={searchParams.get(stateKey)??""} onChange={event=>update(stateKey,event.target.value)} className={inputClass}>{mode==="potential"?<><option value="">Tất cả đánh giá</option><option value="ready">Đủ điều kiện</option><option value="potential">Tiềm năng</option></>:<><option value="">Tất cả trạng thái</option><option value="submitted_v1">Chờ duyệt vòng 1</option><option value="submitted_v2">Chờ duyệt vòng 2</option><option value="needs_revision_v1">Cần chỉnh sửa</option><option value="needs_revision_v2">Cần chỉnh sửa</option><option value="passed">Đạt</option><option value="failed">Không đạt</option></>}</select></div>
    {mode==="potential"?<div className="filter-field"><label>Mức độ đạt</label><select value={searchParams.get("progressLevel")??""} onChange={event=>update("progressLevel",event.target.value)} className={inputClass}><option value="">Tất cả mức độ</option><option value="50">Từ 50%</option><option value="70">Từ 70%</option><option value="90">Từ 90%</option></select></div>:null}
  </FilterRow>;
}
