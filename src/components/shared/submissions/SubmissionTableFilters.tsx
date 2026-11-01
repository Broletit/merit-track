"use client";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterRow from "@/components/shared/filters/FilterRow";

type SelectOption = {value:string;label:string};
const control="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none transition focus:border-blue-500";
export default function SubmissionTableFilters({statusOptions}:{statusOptions:SelectOption[]}) {
  const router=useRouter(),pathname=usePathname(),searchParams=useSearchParams();
  const [eventName,setEventName]=useState(searchParams.get("eventName")??"");
  const searchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(searchTimer.current)clearTimeout(searchTimer.current);},[]);
  function update(key:string,value:string){
    if(searchTimer.current)clearTimeout(searchTimer.current);
    const params=new URLSearchParams(searchParams.toString());
    for(const obsolete of ["cohort","eventId","keyword","page"])params.delete(obsolete);
    if(eventName.trim())params.set("eventName",eventName.trim());else params.delete("eventName");
    if(value)params.set(key,value);else params.delete(key);
    router.replace(pathname+"?"+params.toString(),{scroll:false});
  }
  return <FilterRow className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <div className="relative min-w-0">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
      <input aria-label="Tìm tên đợt xét" placeholder="Tìm tên đợt xét..." value={eventName}
        onChange={event=>{const value=event.target.value;setEventName(value);if(searchTimer.current)clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>update("eventName",value.trim()),350);}}
        className={control+" pl-9"}/>
    </div>
    <select data-filter-label="Trạng thái hồ sơ" aria-label="Lọc trạng thái hồ sơ của tôi" value={searchParams.get("status")??""}
      onChange={event=>update("status",event.target.value)} className={control}>
      <option value="">Tất cả trạng thái hồ sơ</option>
      {statusOptions.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
    <select data-filter-label="Trạng thái tiếp nhận" aria-label="Lọc trạng thái tiếp nhận" value={searchParams.get("phase")??""}
      onChange={event=>update("phase",event.target.value)} className={control}>
      <option value="">Tất cả trạng thái tiếp nhận</option>
      <option value="not_open">Chưa mở nhận hồ sơ</option>
      <option value="accepting">Đang nhận hồ sơ</option>
      <option value="expired">Đã hết hạn</option>
      <option value="closed">Đã đóng</option>
    </select>
    <select aria-label="Sắp xếp hồ sơ của tôi" value={searchParams.get("sort")??"latest"}
      onChange={event=>update("sort",event.target.value)} className={control}>
      <option value="latest">Cập nhật mới nhất</option>
      <option value="oldest">Cập nhật cũ nhất</option>
    </select>
  </FilterRow>;
}
