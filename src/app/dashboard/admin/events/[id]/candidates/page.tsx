import Link from "next/link";
import { notFound } from "next/navigation";
import Pagination from "@/components/common/Pagination";
import CandidateFilters from "@/components/admin/events/CandidateFilters";
import DonutChart from "@/components/admin/reports/DonutChart";
import HorizontalBarChart from "@/components/admin/reports/HorizontalBarChart";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

const PAGE_SIZE = 20;
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

export default async function CandidateAnalysisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; keyword?: string; classCode?: string; group?: string }> }) {
  await requireAdminContext();
  const { id } = await params;
  const eventId = Number(id);
  if (!eventId) notFound();
  const query = await searchParams;
  const db = getDb();
  const event = db.prepare(`SELECT id,title,term_id FROM events WHERE id=? AND type='student' LIMIT 1`).get(eventId) as { id: number; title: string; term_id: number } | undefined;
  if (!event) notFound();

  const required = db.prepare(`SELECT code FROM event_criteria_items WHERE event_id=? AND is_required=1 ORDER BY sort_order,id`).all(eventId) as Array<{ code: string }>;
  const users = db.prepare(`SELECT u.id,u.full_name,u.mssv,c.code class_code FROM users u INNER JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL INNER JOIN classes c ON c.id=cm.class_id WHERE u.is_active=1 AND u.role IN ('student','class_officer','faculty_officer') AND (NOT EXISTS(SELECT 1 FROM event_scopes es WHERE es.event_id=?) OR EXISTS(SELECT 1 FROM event_scopes es WHERE es.event_id=? AND es.class_id=cm.class_id)) ORDER BY c.code,u.mssv`).all(eventId, eventId) as Array<{ id: number; full_name: string; mssv: string; class_code: string }>;
  const submissionRows = db.prepare(`SELECT s.id,s.user_id,s.status,s.submitted_at,EXISTS(SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open') support FROM submissions s WHERE s.event_id=?`).all(eventId) as Array<{ id: number; user_id: number; status: string; submitted_at: string | null; support: number }>;
  const submissionsByUser = new Map(submissionRows.map((item) => [item.user_id, item]));
  const satisfiedRows = db.prepare(`SELECT DISTINCT s.user_id,i.code FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id WHERE s.event_id=? AND (EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1) OR EXISTS(SELECT 1 FROM submission_items si WHERE si.submission_id=s.id AND si.criteria_code=i.code AND LENGTH(TRIM(COALESCE(si.content_text,'')))>0) OR EXISTS(SELECT 1 FROM submission_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code))`).all(eventId) as Array<{ user_id: number; code: string }>;
  const satisfied = new Set(satisfiedRows.map((item) => `${item.user_id}:${item.code}`));
  const activityRows = db.prepare(`SELECT DISTINCT ar.user_id,r.criteria_code code FROM criteria_activity_rules r INNER JOIN events e ON e.criteria_template_id=r.template_id INNER JOIN activities a ON a.id=r.activity_id INNER JOIN activity_registrations ar ON ar.activity_id=a.id AND ar.status='attended' WHERE e.id=?`).all(eventId) as Array<{ user_id: number; code: string }>;
  const activityPassed = new Set(activityRows.map((item) => `${item.user_id}:${item.code}`));
  const conductRows = db.prepare(`SELECT cs.user_id,COALESCE(SUM(cs.score_value),0) score FROM conduct_scores cs INNER JOIN conduct_periods cp ON cp.id=cs.period_id INNER JOIN academic_terms term ON term.academic_year=cp.academic_year AND term.semester=cp.semester WHERE term.id=? GROUP BY cs.user_id`).all(event.term_id) as Array<{ user_id: number; score: number }>;
  const conductByUser = new Map(conductRows.map((item) => [item.user_id, Number(item.score)]));
  const conductRules = db.prepare(`SELECT ccr.criteria_code code,ccr.min_score FROM criteria_conduct_rules ccr INNER JOIN events e ON e.criteria_template_id=ccr.template_id WHERE e.id=?`).all(eventId) as Array<{ code: string; min_score: number }>;
  const conductByCriterion = new Map(conductRules.map((item) => [item.code, Number(item.min_score)]));

  const candidates: Candidate[] = users.map((user) => {
    const submission = submissionsByUser.get(user.id);
    const missing = required.filter((criterion) => {
      if (satisfied.has(`${user.id}:${criterion.code}`) || activityPassed.has(`${user.id}:${criterion.code}`)) return false;
      const minimum = conductByCriterion.get(criterion.code);
      return minimum === undefined || (conductByUser.get(user.id) ?? 0) < minimum;
    });
    const submitted = Boolean(submission?.submitted_at);
    const support = Boolean(submission?.support);
    return { id: user.id, fullName: user.full_name, mssv: user.mssv, classCode: user.class_code, submissionId: submitted || support ? submission?.id ?? null : null, status: submission?.status ?? null, submitted, support, passed: required.length - missing.length, total: required.length, missing: missing.map((item) => item.code), group: classifyCandidate({ status: submission?.status ?? null, submitted, support, missingCount: missing.length }) };
  });

  const keyword = String(query.keyword ?? "").trim().toLocaleLowerCase("vi");
  const classCode = String(query.classCode ?? "").trim().toLocaleLowerCase("vi");
  const group = String(query.group ?? "").trim();
  const filtered = candidates.filter((item) => (!keyword || `${item.fullName} ${item.mssv}`.toLocaleLowerCase("vi").includes(keyword)) && (!classCode || item.classCode.toLocaleLowerCase("vi").includes(classCode)) && (!group || item.group === group));
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const classOptions = Array.from(new Set(users.map((item) => item.class_code))).sort((left, right) => left.localeCompare(right, "vi"));
  const counts = (key: string) => candidates.filter((item) => item.group === key).length;
  const statusCount = (statuses: string[]) => candidates.filter((item) => item.submitted && statuses.includes(String(item.status))).length;
  const submittedCount = candidates.filter((item) => item.submitted).length;
  const passedCount = statusCount(["passed", "approved"]);
  const reviewingCount = statusCount(["submitted_v1", "submitted_v2"]);
  const revisionCount = statusCount(["needs_revision_v1", "needs_revision_v2", "rejected_v1", "rejected_v2"]);
  const failedCount = statusCount(["failed", "rejected"]);
  const supportCount = candidates.filter((item) => item.support).length;

  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Phân tích hồ sơ và ứng viên</h1><p className="mt-1 text-sm text-blue-100/80">{event.title}</p></div><Link href={`/dashboard/admin/events/${eventId}`} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium">Quay về đợt xét</Link></div></section>
    <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <SummaryCard label="Tổng hồ sơ đã nộp" value={submittedCount} tone="blue" />
      <SummaryCard label="Hồ sơ đã đạt" value={passedCount} tone="green" />
      <SummaryCard label="Hồ sơ không đạt" value={failedCount} tone="red" />
      <SummaryCard label="Đang chờ duyệt" value={reviewingCount} tone="cyan" />
      <SummaryCard label="Cần điều chỉnh" value={revisionCount} tone="amber" />
      <SummaryCard label="Hồ sơ cần hỗ trợ" value={supportCount} tone="violet" />
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Cơ cấu xử lý hồ sơ đã nộp</h2>
        <div className="mt-5"><DonutChart items={[
          { label: "Đã đạt", value: passedCount, className: "#10b981" },
          { label: "Chờ duyệt", value: reviewingCount, className: "#3b82f6" },
          { label: "Cần điều chỉnh", value: revisionCount, className: "#f59e0b" },
          { label: "Không đạt", value: failedCount, className: "#ef4444" },
        ]} /></div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Ứng viên chưa tham gia</h2>
        <div className="mt-5"><HorizontalBarChart valueLabel="sinh viên" items={[
          { label: "Đủ điều kiện nhưng chưa tham gia", value: counts("candidate_ready") },
          { label: "Thiếu 1–2 tiêu chí", value: counts("candidate_support") },
        ]} /></div>
      </div>
    </section>
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <CandidateFilters classes={classOptions} groups={groupOptions} initialKeyword={query.keyword ?? ""} initialClass={query.classCode ?? ""} initialGroup={group} />
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[900px]"><thead className="bg-slate-50"><tr>{["Sinh viên", "Lớp", "Mức đáp ứng", "Phân loại", "Mã tiêu chí còn thiếu", "Hồ sơ"].map((label) => <th key={label} className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => { const label = groupOptions.find((option) => option.value === item.group)?.label ?? "Chưa phân loại"; return <tr key={item.id}><td className="px-4 py-3 text-sm"><div className="font-medium">{item.fullName}</div><div className="text-xs text-slate-500">{item.mssv}</div></td><td className="px-4 py-3 text-sm">{item.classCode}</td><td className="px-4 py-3 text-sm font-semibold text-blue-700">{item.passed}/{item.total}</td><td className="px-4 py-3 text-sm"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${groupClass(item.group)}`}>{label}</span>{item.support ? <div className="mt-1 text-xs font-medium text-amber-700">Đã gửi yêu cầu hỗ trợ</div> : null}</td><td className="max-w-xs px-4 py-3 text-sm text-slate-600">{item.missing.length ? item.missing.join(", ") : "Không thiếu"}</td><td className="px-4 py-3 text-sm">{item.submissionId ? <Link href={`/dashboard/admin/submissions/${item.submissionId}`} className="font-semibold text-blue-700">Xem hồ sơ</Link> : <span className="text-slate-400">Chưa gửi hồ sơ</span>}</td></tr>; })}{!rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Không có sinh viên phù hợp.</td></tr> : null}</tbody></table></div>
    </section>
    <Pagination page={page} totalPages={totalPages} searchParams={{ keyword: query.keyword ?? "", classCode: query.classCode ?? "", group }} />
  </main>;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "amber" | "red" | "cyan" | "violet" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    red: "bg-rose-50 text-rose-800 ring-rose-100",
    cyan: "bg-cyan-50 text-cyan-800 ring-cyan-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    violet: "bg-violet-50 text-violet-800 ring-violet-100",
  }[tone];
  return <div className={`flex min-h-28 min-w-0 flex-col justify-between rounded-2xl p-4 ring-1 ${toneClass}`}><div className="text-base font-semibold leading-5">{label}</div><div className="mt-3 text-3xl font-bold leading-none">{value}</div></div>;
}
