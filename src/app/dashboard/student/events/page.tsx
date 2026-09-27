import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import StudentEventsHeader from "@/components/student/events/StudentEventsHeader";
import StudentEventsTable from "@/components/student/events/StudentEventsTable";
import type { StudentEventItem } from "@/components/student/events/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import { getEventSubmissionPhaseFilter } from "@/server/events/eventSubmissionPhaseFilter";

type SearchParams = Promise<{
  termId?: string;
  keyword?: string;
  submissionStatus?: string;
  phase?: string;
}>;

type Row = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  submission_status: string | null;
};

export default async function StudentEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;

  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const keyword = String(params.keyword ?? "").trim();
  const submissionStatus = String(params.submissionStatus ?? "").trim();
  const phase = String(params.phase ?? "").trim();

  const where: string[] = [
    `e.status = 'published'`,
    `e.type = 'student'`,
    `e.term_id = ?`,
  ];

  const values: unknown[] = [selectedTerm.id];

  // 🔍 keyword
  if (keyword) {
    where.push(`(e.title LIKE ? OR e.description LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  // trạng thái hồ sơ
  if (submissionStatus === "none") {
    where.push(`s.id IS NULL`);
  } else if (submissionStatus === "rejected") {
    where.push(`s.status IN ('rejected_v1', 'rejected_v2')`);
  } else if (submissionStatus) {
    where.push(`s.status = ?`);
    values.push(submissionStatus);
  }

  const phaseFilter = getEventSubmissionPhaseFilter(phase);
  if (phaseFilter) where.push(`(${phaseFilter})`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const rows = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.type,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        s.status AS submission_status
      FROM events e
      LEFT JOIN submissions s
        ON s.event_id = e.id
       AND s.user_id = ?
      ${whereSql}
      ORDER BY datetime(e.start_at) DESC, e.id DESC
      `
    )
    .all(user.id, ...values) as Row[];

  const items: StudentEventItem[] = rows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    description: item.description ? String(item.description) : "",
    type: String(item.type ?? ""),
    status: String(item.status ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    allowLate: Number(item.allow_late ?? 0) === 1,
    submissionStatus: item.submission_status
      ? String(item.submission_status)
      : null,
  }));

  return (
    <main className="space-y-6">
      <StudentEventsHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />

      {!selectedTerm.isActive ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Bạn đang xem học kỳ cũ. Chỉ xem lại đợt xét, không gửi hồ sơ mới.
        </section>
      ) : null}

      <StudentEventsTable items={items} />
    </main>
  );
}
