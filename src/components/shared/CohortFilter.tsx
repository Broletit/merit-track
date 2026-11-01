"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useCohorts from "@/components/shared/useCohorts";
export default function CohortFilter() {
 const {cohorts}=useCohorts();
 const pathname=usePathname(),router=useRouter(),params=useSearchParams();
 return <select aria-label="Lọc theo khóa" name="cohort" value={params.get("cohort") ?? ""} onChange={event=>{
  const next=new URLSearchParams(params.toString());
  if(event.target.value) next.set("cohort",event.target.value); else next.delete("cohort");
  for (const key of ["classId", "class", "classCode"]) next.delete(key);
  next.delete("page"); next.delete("potentialPage"); router.replace(`${pathname}?${next.toString()}`, { scroll: false });
 }} className="h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-blue-500">
  <option value="">Tất cả khóa</option>{cohorts.map(cohort=><option key={cohort} value={cohort}>Khóa {cohort}</option>)}
 </select>;
}
