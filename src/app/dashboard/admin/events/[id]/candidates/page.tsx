import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { assessCandidateCriteria, type CandidateCriterion } from "@/lib/submissions/candidateAssessment";
import NumberedTable from "@/components/common/NumberedTable";
import { cohortFromMssv, parseCohort } from "@/lib/cohorts/cohorts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheckBig, CircleX, Clock3, FilePenLine, Files, HeartHandshake } from "lucide-react";
import Pagination from "@/components/common/Pagination";
import CandidateFilters from "@/components/admin/events/CandidateFilters";
import DonutChart from "@/components/admin/reports/DonutChart";
import HorizontalBarChart from "@/components/admin/reports/HorizontalBarChart";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

const PAGE_SIZE = 10;
const groupOptions = [
  { value: "official_passed", label: "Hồ sơ đã đạt" },
  { value: "official_reviewing", label: "Hồ sơ đang chờ duyệt" },
  { value: "official_revision", label: "Hồ sơ cần điều chỉnh" },
  { value: "official_support", label: "Hồ sơ cần hỗ trợ" },
  { value: "official_failed", label: "Hồ sơ không đạt" },
  { value: "candidate_ready", label: "Ứng viên đủ điều kiện" },
  { value: "candidate_support", label: "Ứng viên cần hỗ trợ" },
  { value: "candidate_not_ready", label: "Chưa đủ điều kiện" },
];

type Candidate = { id: number; fullName: string; mssv: string; classCode: string; submissionId: number | null; status: string | null; submitted: boolean; support: boolean; passed: number; total: number; missing: string[]; group: string };

function classifyCandidate({ status, submitted, support, missingCount }: { status: string | null; submitted: boolean; support: boolean; missingCount: number }) {
  if (["passed","approved"].includes(String(status))) return "official_passed";
  if (["failed","rejected","closed"].includes(String(status))) return "official_failed";
  if (support) return "official_support";
  if (submitted) {
    if (["passed", "approved"].includes(String(status))) return "official_passed";
    if (["submitted_v1", "submitted_v2"].includes(String(status))) return "official_reviewing";
    if (["needs_revision_v1", "needs_revision_v2", "rejected_v1", "rejected_v2"].includes(String(status))) return "official_revision";
    if (["failed", "rejected"].includes(String(status))) return "official_failed";
    return "official_reviewing";
  }
  if (missingCount > 0 && missingCount <= 2) return "candidate_support";
  if (missingCount === 0) return "candidate_ready";
  return "candidate_not_ready";
}

function groupClass(group: string) {
  if (["official_passed", "candidate_ready"].includes(group)) return "bg-emerald-50 text-emerald-700";
  if (["official_support", "official_revision", "candidate_support"].includes(group)) return "bg-amber-50 text-amber-700";
  if (group === "official_failed") return "bg-rose-50 text-rose-700";
  if (group === "official_reviewing") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

export default async function CandidateAnalysisPage({ params, searchParams }: { params: Promise<{ cohort?: string; id: string }>; searchParams: Promise<{ cohort?: string; page?: string; keyword?: string; classCode?: string; group?: string }> }) {
  await requireAdminContext();
  const { id } = await params;
  const eventId = await getDatabase().resolveRouteRecordId(id);
  if (!eventId) notFound();
  const query = await searchParams;
  const db = getDatabase();
  const event = (await db.first(`SELECT id,title,term_id FROM events WHERE id=? AND type='student' LIMIT 1`, [eventId])) as { id: number; title: string; term_id: number } | undefined;
  if (!event) notFound();

  const criteria = (await db.rows(`SELECT code,group_code,is_required,evidence_type FROM event_criteria_items WHERE event_id=? ORDER BY sort_order,id`, [eventId])) as CandidateCriterion[];
  const criteriaGroups = (await db.rows(`SELECT code,min_required FROM event_criteria_groups WHERE event_id=? ORDER BY sort_order,id`, [eventId])) as Array<{code:string;min_required:number}>;
  const users = (await db.rows(`SELECT u.id,u.full_name,u.mssv,c.code class_code,c.cohort class_cohort FROM users u INNER JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL INNER JOIN classes c ON c.id=cm.class_id WHERE u.is_active=1 AND u.role IN ('student','class_officer','faculty_officer') AND (NOT EXISTS(SELECT 1 FROM event_scopes es WHERE es.event_id=?) OR EXISTS(SELECT 1 FROM event_scopes es WHERE es.event_id=? AND es.class_id=cm.class_id)) ORDER BY c.code,u.mssv`, [eventId, eventId])) as Array<{ id: number; full_name: string; mssv: string; class_code: string; class_cohort: number | null }>;
  const submissionRows = (await db.rows(`SELECT s.id,s.user_id,s.status,s.submitted_at,EXISTS(SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open') support FROM submissions s WHERE s.event_id=?`, [eventId])) as Array<{ id: number; user_id: number; status: string; submitted_at: string | null; support: number }>;
  const submissionsByUser = new Map(submissionRows.map((item) => [item.user_id, item]));
  const fileRows=(await db.rows(`SELECT DISTINCT s.user_id,sf.criteria_code code FROM submissions s JOIN submission_ready_files sf ON sf.submission_id=s.id WHERE s.event_id=?`, [eventId])) as Array<{user_id:number;code:string}>;
  const autoRows=(await db.rows(`SELECT DISTINCT s.user_id,ar.criteria_code code FROM submissions s JOIN submission_auto_results ar ON ar.submission_id=s.id WHERE s.event_id=? AND ar.passed=1`, [eventId])) as Array<{user_id:number;code:string}>;
  const reviewRows=(await db.rows(`SELECT s.user_id,cr.criteria_code code,cr.decision FROM submissions s JOIN submission_criteria_reviews cr ON cr.submission_id=s.id WHERE s.event_id=? AND cr.round<=s.review_round ORDER BY cr.round DESC,cr.reviewed_at DESC,cr.id DESC`, [eventId])) as Array<{user_id:number;code:string;decision:string}>;
  const reviews=new Map<string,string>();
  for(const review of reviewRows){const key=review.user_id+":"+review.code;if(!reviews.has(key))reviews.set(key,review.decision);}
  const files=new Set(fileRows.map(row=>row.user_id+":"+row.code));
  const autoPassed=new Set(autoRows.map(row=>row.user_id+":"+row.code));
  const activityRows = (await db.rows(`SELECT DISTINCT ar.user_id,r.criteria_code code FROM criteria_activity_rules r INNER JOIN events e ON e.criteria_template_id=r.template_id INNER JOIN activities a ON a.id=r.activity_id INNER JOIN activity_registrations ar ON ar.activity_id=a.id AND ar.status='attended' WHERE e.id=?`, [eventId])) as Array<{ user_id: number; code: string }>;
  const activityPassed = new Set(activityRows.map((item) => `${item.user_id}:${item.code}`));
  const conductRows = (await db.rows(`SELECT cs.user_id,COALESCE(SUM(cs.score_value),0) score FROM conduct_scores cs INNER JOIN conduct_periods cp ON cp.id=cs.period_id INNER JOIN academic_terms term ON term.academic_year=cp.academic_year AND term.semester=cp.semester WHERE term.id=? GROUP BY cs.user_id`, [event.term_id])) as Array<{ user_id: number; score: number }>;
  const conductByUser = new Map(conductRows.map((item) => [item.user_id, Number(item.score)]));
  const conductRules = (await db.rows(`SELECT ccr.criteria_code code,ccr.min_score FROM criteria_conduct_rules ccr INNER JOIN events e ON e.criteria_template_id=ccr.template_id WHERE e.id=?`, [eventId])) as Array<{ code: string; min_score: number }>;
  const conductByCriterion = new Map(conductRules.map((item) => [item.code, Number(item.min_score)]));

  const candidates: Candidate[] = users.map((user) => {
    const submission = submissionsByUser.get(user.id);
    const submitted = Boolean(submission?.submitted_at);
    const support = Boolean(submission?.support);
    const assessment=assessCandidateCriteria(criteria,criteriaGroups,{
      submitted:submitted||["failed","rejected","closed","passed","approved"].includes(submission?.status??""),
      autoPassed:new Set(criteria.filter(item=>{
        const key=user.id+":"+item.code;
        const minimum=conductByCriterion.get(item.code);
        return autoPassed.has(key)||activityPassed.has(key)||(minimum!==undefined&&(conductByUser.get(user.id)??0)>=minimum);
      }).map(item=>item.code)),
      files:new Set(criteria.filter(item=>files.has(user.id+":"+item.code)).map(item=>item.code)),
      reviews:new Map(criteria.filter(item=>reviews.has(user.id+":"+item.code)).map(item=>[item.code,reviews.get(user.id+":"+item.code)!])),
    });
    const missing=assessment.missing.map(item=>item.code);
    return { id: user.id, fullName: user.full_name, mssv: user.mssv, classCode: user.class_code, submissionId: submission?.id ?? null, status: submission?.status ?? null, submitted, support, passed: assessment.passed, total: assessment.total, missing, group: classifyCandidate({ status: submission?.status ?? null, submitted, support, missingCount: assessment.blockingCount }) };
  });

  const keyword = String(query.keyword ?? "").trim().toLocaleLowerCase("vi");
  const classCode = String(query.classCode ?? "").trim().toLocaleLowerCase("vi");
  const group = String(query.group ?? "").trim();
  const filtered = candidates.filter((item) => (!query.cohort || cohortFromMssv(item.mssv) === parseCohort(query.cohort)) && (!keyword || `${item.fullName} ${item.mssv}`.toLocaleLowerCase("vi").includes(keyword)) && (!classCode || item.classCode.toLocaleLowerCase("vi") === classCode) && (!group || item.group === group));
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const classOptions = Array.from(new Set(users.filter(item=>!query.cohort || String(item.class_cohort) === query.cohort).map((item) => item.class_code))).sort((left, right) => left.localeCompare(right, "vi"));
  const counts = (key: string) => candidates.filter((item) => item.group === key).length;
  const statusCount = (statuses: string[]) => candidates.filter((item) => item.submitted && statuses.includes(String(item.status))).length;
  const submittedCount = candidates.filter((item) => item.submitted).length;
  const passedCount = statusCount(["passed", "approved"]);
  const reviewingCount = statusCount(["submitted_v1", "submitted_v2"]);
  const revisionCount = statusCount(["needs_revision_v1", "needs_revision_v2", "rejected_v1", "rejected_v2"]);
  const failedCount = statusCount(["failed", "rejected"]);
  const supportCount = candidates.filter((item) => item.support).length;

  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-md shadow-slate-200/60"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Phân tích hồ sơ và ứng viên</h1><p className="mt-1 text-sm text-blue-100/80">{event.title}</p></div><Link href={`/dashboard/admin/events/${eventId}`} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium" data-back-link><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>Quay về đợt xét</Link></div></section>
    <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <SummaryCard icon={<Files size={18} />} label="Tổng hồ sơ đã nộp" value={submittedCount} />
      <SummaryCard icon={<CircleCheckBig size={18} />} label="Hồ sơ đã đạt" value={passedCount} />
      <SummaryCard icon={<CircleX size={18} />} label="Hồ sơ không đạt" value={failedCount} />
      <SummaryCard icon={<Clock3 size={18} />} label="Đang chờ duyệt" value={reviewingCount} />
      <SummaryCard icon={<FilePenLine size={18} />} label="Cần điều chỉnh" value={revisionCount} />
      <SummaryCard icon={<HeartHandshake size={18} />} label="Hồ sơ cần hỗ trợ" value={supportCount} />
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-lg font-semibold text-slate-900">Cơ cấu xử lý hồ sơ đã nộp</h2>
        <div className="mt-5"><DonutChart items={[
          { label: "Đã đạt", value: passedCount, className: "#10b981" },
          { label: "Chờ duyệt", value: reviewingCount, className: "#3b82f6" },
          { label: "Cần điều chỉnh", value: revisionCount, className: "#f59e0b" },
          { label: "Không đạt", value: failedCount, className: "#ef4444" },
        ]} /></div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-lg font-semibold text-slate-900">Ứng viên chưa tham gia</h2>
        <div className="mt-5"><HorizontalBarChart valueLabel="sinh viên" items={[
          { label: "Đủ điều kiện nhưng chưa tham gia", value: counts("candidate_ready") },
          { label: "Thiếu 1–2 tiêu chí", value: counts("candidate_support") },
        ]} /></div>
      </div>
    </section>
    <div data-table-frame className="min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <CandidateFilters classes={classOptions} groups={groupOptions} initialKeyword={query.keyword ?? ""} initialClass={query.classCode ?? ""} initialGroup={group} />
      <div className="mt-5 overflow-x-auto rounded-none border border-slate-200"><NumberedTable page={page} className="w-full min-w-0"><thead className="bg-slate-50"><tr>{["Sinh viên", "Lớp", "Tiêu chí đáp ứng", "Phân loại", "Tiêu chí chưa đáp ứng", "Hồ sơ"].map((label) => <th data-column-align={label === "Lớp" ? "left" : undefined} key={label} className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => { const label = groupOptions.find((option) => option.value === item.group)?.label ?? "Chưa phân loại"; return <tr key={item.id} className="align-top"><td className="px-4 py-3 text-sm"><div className="font-medium">{item.fullName}</div><div className="text-xs text-slate-500">{item.mssv}</div></td><td data-column-align="left" className="px-4 py-3 text-sm text-left">{item.classCode}</td><td className="px-4 py-3 text-sm font-semibold text-blue-700">{item.passed}/{item.total}</td><td className="px-4 py-3 text-sm"><span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${groupClass(item.group)}`}>{label}</span>{item.support ? <div className="mt-1 text-xs font-medium text-amber-700">Đã gửi yêu cầu hỗ trợ</div> : null}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{item.missing.length ? item.missing.join(", ") : "Không thiếu"}</td><td className="px-4 py-3 text-sm">{item.submissionId ? <Link href={`/dashboard/admin/submissions/${item.submissionId}`} className="font-semibold text-blue-700">Xem hồ sơ</Link> : <span className="text-slate-400">Chưa gửi hồ sơ</span>}</td></tr>; })}{!rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Không có sinh viên phù hợp.</td></tr> : null}</tbody></NumberedTable></div>
    </section>
<Pagination totalResults={filtered.length} resultLabel="sinh viên" page={page} totalPages={totalPages} searchParams={{ cohort: query.cohort, keyword: query.keyword ?? "", classCode: query.classCode ?? "", group }} />
</div>
  </main>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex shrink-0 items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>;
}
