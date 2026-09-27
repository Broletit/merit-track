import Link from "next/link";
import { FileText } from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import SubmissionTableFilters from "@/components/shared/submissions/SubmissionTableFilters";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ page?:string; keyword?:string; termId?:string; eventId?:string; status?:string }>;
type Row = { id:number; status:string; updated_at:string; event_title:string; student_name:string; mssv:string; class_code:string };
type EventOption = { id:number; title:string };
const PAGE_SIZE = 10;
const statusOptions = [
  {value:"submitted_v1",label:"Chờ duyệt vòng 1"},{value:"submitted_v2",label:"Chờ duyệt vòng 2"},
  {value:"needs_revision_v1",label:"Cần chỉnh sửa"},{value:"needs_revision_v2",label:"Cần chỉnh sửa"},
  {value:"passed",label:"Đã đạt"},{value:"approved",label:"Đã đạt"},{value:"failed",label:"Không đạt"},
];

export default async function FacultyOfficerSubmissionsPage({searchParams}:{searchParams:SearchParams}) {
  const officer = await requireFacultyOfficerContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const eventId = Number(params.eventId ?? 0);
  const page = Math.max(1,Number(params.page ?? "1")||1);
  const offset = (page-1)*PAGE_SIZE;
  const scope = "EXISTS (SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=? AND fca.class_id=s.class_id)";
  const eventOptions = db.prepare(`SELECT DISTINCT e.id,e.title FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE e.term_id=? AND e.type='student' AND s.status<>'draft' AND ${scope} ORDER BY datetime(e.start_at) DESC,e.id DESC`).all(selectedTerm.id,officer.id) as EventOption[];
  const where = ["e.term_id=?","e.type='student'","s.status<>'draft'","s.submitted_at IS NOT NULL",scope];
  const values:unknown[]=[selectedTerm.id,officer.id];
  if(keyword){where.push("(u.full_name LIKE ? OR u.mssv LIKE ? OR c.code LIKE ?)");values.push(`%${keyword}%`,`%${keyword}%`,`%${keyword}%`);}
  if(eventId>0){where.push("e.id=?");values.push(eventId);}
  if(status){where.push("s.status=?");values.push(status);}
  const whereSql=`WHERE ${where.join(" AND ")}`;
  const total=db.prepare(`SELECT COUNT(*) total FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN users u ON u.id=s.user_id INNER JOIN classes c ON c.id=s.class_id ${whereSql}`).get(...values) as {total:number};
  const rows=db.prepare(`SELECT s.id,s.status,s.updated_at,e.title event_title,u.full_name student_name,u.mssv,c.code class_code FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN users u ON u.id=s.user_id INNER JOIN classes c ON c.id=s.class_id ${whereSql} ORDER BY datetime(s.updated_at) DESC,s.id DESC LIMIT ? OFFSET ?`).all(...values,PAGE_SIZE,offset) as Row[];
  const totalPages=Math.max(1,Math.ceil(Number(total.total??0)/PAGE_SIZE));
  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><FileText size={22}/></div><h1 className="text-2xl font-semibold">Hồ sơ</h1></div><AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id}/></div></section>
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Danh sách hồ sơ</h2><div className="mt-1 text-sm text-slate-400">{Number(total.total??0)} hồ sơ</div>
      <div className="mt-5"><SubmissionTableFilters eventOptions={eventOptions} statusOptions={statusOptions}/></div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[820px] table-fixed divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="w-[25%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét</th><th className="w-[24%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Sinh viên</th><th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Lớp</th><th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th><th className="w-[13%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Cập nhật</th><th className="w-[8%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Xem</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.length?rows.map(item=><tr key={item.id} className="hover:bg-slate-50/70"><td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.event_title}</td><td className="px-4 py-4"><div className="text-sm font-semibold text-slate-900">{item.student_name}</div><div className="mt-1 text-xs text-slate-500">{item.mssv}</div></td><td className="px-4 py-4 text-sm text-slate-700">{item.class_code}</td><td className="px-4 py-4"><SubmissionStatusBadge status={item.status}/></td><td className="px-4 py-4 text-sm text-slate-700">{formatDateTimeVN(item.updated_at)}</td><td className="px-4 py-4 text-center"><Link href={`/dashboard/faculty-officer/submissions/${item.id}?termId=${selectedTerm.id}`} className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Xem</Link></td></tr>):<tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Không có hồ sơ phù hợp.</td></tr>}</tbody></table></div>
      <div className="mt-5"><Pagination page={page} totalPages={totalPages} searchParams={{keyword,termId:String(selectedTerm.id),eventId:eventId>0?String(eventId):"",status}}/></div>
    </section>
  </main>;
}
