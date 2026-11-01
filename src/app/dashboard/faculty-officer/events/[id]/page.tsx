import CriteriaDefinitionTable from "@/components/shared/criteria/CriteriaDefinitionTable";
import PaginatedTable from "@/components/common/PaginatedTable";
import { addCohortFilter } from "@/server/cohorts/sql";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import EventSubmissionFilters from "@/components/shared/events/EventSubmissionFilters";

type EventRow={id:number;title:string;description:string|null;status:string;start_at:string;end_at:string;allow_late:number};
type SubmissionRow={id:number;status:string;updated_at:string;student_name:string;mssv:string;class_code:string};
type ClassSummary={id:number;code:string;cohort:number|null;total:number;waiting_round_2:number;passed:number};

export default async function Page({params,searchParams}:{params:Promise<{ cohort?: string;id:string}>;searchParams:Promise<{ cohort?: string;termId?:string;keyword?:string;status?:string;classId?:string}>}){
  const officer=await requireFacultyOfficerContext();
  const [{id},sp]=await Promise.all([params,searchParams]);
  const eventId=await getDatabase().resolveRouteRecordId(id); if(!Number.isFinite(eventId)||eventId<=0)notFound();
  const db=getDatabase();
  const event=(await db.first(`SELECT e.id,e.title,e.description,e.status,e.start_at,e.end_at,e.allow_late FROM events e WHERE e.id=? AND e.type='student' AND e.status='published' AND EXISTS(SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=?) LIMIT 1`, [eventId, officer.id])) as EventRow|undefined;
  if(!event)notFound();
  const keyword=String(sp.keyword??"").trim(), status=String(sp.status??"").trim(), classId=Number(sp.classId??0);
  const where=["s.event_id=?","s.submitted_at IS NOT NULL","EXISTS(SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=? AND fca.class_id=s.class_id)"];
  const values:unknown[]=[eventId,officer.id];
  addCohortFilter(where,values,sp.cohort,"u.cohort");
  if(keyword){where.push("(u.full_name LIKE ? OR u.mssv LIKE ?)");values.push(`%${keyword}%`,`%${keyword}%`);}
  if(status){where.push("s.status=?");values.push(status);}
  if(classId>0){where.push("s.class_id=?");values.push(classId);}
  const submissions=(await db.rows(`SELECT s.id,s.status,s.updated_at,u.full_name student_name,u.mssv,c.code class_code FROM submissions s INNER JOIN users u ON u.id=s.user_id INNER JOIN classes c ON c.id=s.class_id WHERE ${where.join(" AND ")} ORDER BY c.code,u.full_name`, [...values])) as SubmissionRow[];
  const classes=(await db.rows(`SELECT c.id,c.code,c.cohort,COUNT(s.id) total,SUM(CASE WHEN s.status='submitted_v2' THEN 1 ELSE 0 END) waiting_round_2,SUM(CASE WHEN s.status='passed' THEN 1 ELSE 0 END) passed FROM faculty_class_assignments fca INNER JOIN classes c ON c.id=fca.class_id LEFT JOIN submissions s ON s.class_id=c.id AND s.event_id=? AND s.submitted_at IS NOT NULL WHERE fca.faculty_officer_id=? GROUP BY c.id,c.code ORDER BY c.code`, [eventId, officer.id])) as ClassSummary[];
  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-md shadow-slate-200/60"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">{event.title}</h1><p className="mt-1 text-sm text-blue-100/80">{formatDateTimeVN(event.start_at)} → {formatDateTimeVN(event.end_at)}</p></div><Link href={`/dashboard/faculty-officer/events${sp.termId?`?termId=${sp.termId}`:""}`} className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-800" data-back-link><ArrowLeft size={16}/><span className="ml-2">Quay về</span></Link></div></section>
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold">Thông tin đợt xét</h2><div className="mt-5 grid items-stretch gap-4 md:grid-cols-2"><div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><h3 className="text-sm font-medium text-slate-600">Mô tả</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{event.description||"Chưa có mô tả."}</p></div><div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><h3 className="mb-2 text-sm font-medium text-slate-600">Trạng thái tiếp nhận</h3><EventSubmissionPhaseBadge event={{status:event.status,startAt:event.start_at,endAt:event.end_at,allowLate:Boolean(event.allow_late)}}/></div></div></section>
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold">Tình hình các lớp được phân công</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{classes.map(item=><div key={item.id} className="rounded-none border border-slate-200 p-4"><div className="font-semibold">{item.code}</div><div className="mt-2 text-sm text-slate-500">{item.total} hồ sơ · {item.waiting_round_2} chờ vòng 2 · {item.passed} đạt</div></div>)}</div></section>
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div><EventSubmissionFilters classes={classes.filter(item => !sp.cohort || String(item.cohort) === sp.cohort)}/></div>

      <h2 className="mt-5 text-xl font-semibold">Hồ sơ sinh viên</h2>
      <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<PaginatedTable className="w-full min-w-0 table-fixed divide-y divide-slate-200" containerClassName="overflow-x-auto rounded-none border border-slate-200" resultLabel="bản ghi"><thead className="bg-slate-50"><tr><th className="w-[30%] px-4 py-3 text-left text-sm font-semibold">Sinh viên</th><th data-column-align="left" className="w-[14%] px-4 py-3  text-sm font-semibold text-left">Lớp</th><th className="w-[22%] px-4 py-3 text-left text-sm font-semibold">Trạng thái</th><th className="w-[22%] px-4 py-3 text-left text-sm font-semibold">Cập nhật</th><th className="w-[12%] px-4 py-3 text-center text-sm font-semibold">Xem</th></tr></thead><tbody className="divide-y divide-slate-100">{submissions.length?submissions.map(item=><tr key={item.id}><td className="px-4 py-4"><div className="text-sm font-semibold">{item.student_name}</div><div className="mt-1 text-xs text-slate-500">{item.mssv}</div></td><td data-column-align="left" className="px-4 py-4 text-sm text-left">{item.class_code}</td><td className="px-4 py-4"><SubmissionStatusBadge status={item.status}/></td><td className="px-4 py-4 text-sm">{formatDateTimeVN(item.updated_at)}</td><td className="px-4 py-4 text-center"><Link href={`/dashboard/faculty-officer/reviews/${item.id}?termId=${sp.termId??""}`} className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium">Xem</Link></td></tr>):<tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Không có hồ sơ phù hợp.</td></tr>}</tbody></PaginatedTable>

</div>
    </section>
  <CriteriaDefinitionTable eventId={eventId}/>
</main>;
}
