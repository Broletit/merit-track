import Link from "next/link";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import ClassEventsFilter from "@/components/class-officer/events/ClassEventsFilter";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getEventSubmissionPhaseFilter } from "@/server/events/eventSubmissionPhaseFilter";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ keyword?: string; status?: string; phase?: string; termId?: string; page?: string }>;
type Row = { id:number; title:string; status:string; start_at:string; end_at:string; allow_late:number; total_submissions:number; submitted_v1:number; submitted_v2:number; passed:number };
const PAGE_SIZE = 10;

export default async function FacultyOfficerEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const officer = await requireFacultyOfficerContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const phase = String(params.phase ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const assigned = `EXISTS (SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=? AND fca.class_id=s.class_id)`;
  const where = ["e.type='student'", "e.status='published'", "e.term_id=?", `EXISTS (SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=?)`];
  const values: unknown[] = [selectedTerm.id, officer.id];
  if (keyword) { where.push("(e.title LIKE ? OR e.description LIKE ?)"); values.push(`%${keyword}%`, `%${keyword}%`); }
  if (status) { where.push(`EXISTS (SELECT 1 FROM submissions s WHERE s.event_id=e.id AND ${assigned} AND s.status=?)`); values.push(officer.id, status); }
  const phaseFilter = getEventSubmissionPhaseFilter(phase);
  if (phaseFilter) where.push(`(${phaseFilter})`);
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const total = db.prepare(`SELECT COUNT(*) total FROM events e ${whereSql}`).get(...values) as { total:number };
  const rows = db.prepare(`
    SELECT e.id,e.title,e.status,e.start_at,e.end_at,e.allow_late,
      (SELECT COUNT(*) FROM submissions s WHERE s.event_id=e.id AND s.status<>'draft' AND ${assigned}) total_submissions,
      (SELECT COUNT(*) FROM submissions s WHERE s.event_id=e.id AND s.status='submitted_v1' AND ${assigned}) submitted_v1,
      (SELECT COUNT(*) FROM submissions s WHERE s.event_id=e.id AND s.status='submitted_v2' AND ${assigned}) submitted_v2,
      (SELECT COUNT(*) FROM submissions s WHERE s.event_id=e.id AND s.status='passed' AND ${assigned}) passed
    FROM events e ${whereSql}
    ORDER BY datetime(e.start_at) DESC,e.id DESC LIMIT ? OFFSET ?
  `).all(officer.id, officer.id, officer.id, officer.id, ...values, PAGE_SIZE, offset) as Row[];
  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));

  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Đợt xét</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id}/></div>
    </section>
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Danh sách đợt xét</h2>
      <div className="mt-1 text-sm text-slate-400">{Number(total.total ?? 0)} đợt xét</div>
      <div className="mt-5"><ClassEventsFilter/></div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[850px] table-fixed divide-y divide-slate-200">
        <thead className="bg-slate-50"><tr><th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét</th><th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Thời gian</th><th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Nhận hồ sơ</th><th className="w-[9%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Tổng</th><th className="w-[9%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Vòng 1</th><th className="w-[9%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Vòng 2</th><th className="w-[9%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Xem</th></tr></thead>
        <tbody className="divide-y divide-slate-100 bg-white">{rows.length ? rows.map((item)=><tr key={item.id} className="hover:bg-slate-50/70"><td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.title}</td><td className="px-4 py-4 text-sm text-slate-700">{formatDateTimeVN(item.start_at)}</td><td className="px-4 py-4"><EventSubmissionPhaseBadge event={{status:item.status,startAt:item.start_at,endAt:item.end_at,allowLate:Boolean(item.allow_late)}}/></td><td className="px-4 py-4 text-center text-sm">{item.total_submissions}</td><td className="px-4 py-4 text-center text-sm text-amber-700">{item.submitted_v1}</td><td className="px-4 py-4 text-center text-sm text-blue-700">{item.submitted_v2}</td><td className="px-4 py-4 text-center"><Link href={`/dashboard/faculty-officer/events/${item.id}?termId=${selectedTerm.id}`} className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Xem</Link></td></tr>) : <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Không có đợt xét phù hợp.</td></tr>}</tbody>
      </table></div>
      <div className="mt-5"><ReviewPagination page={page} totalPages={totalPages} basePath="/dashboard/faculty-officer/events" searchParams={{keyword,status,phase,termId:String(selectedTerm.id)}}/></div>
    </section>
  </main>;
}
