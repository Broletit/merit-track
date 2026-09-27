import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import OfficerActivitiesTable from "@/components/faculty-officer/officer-activities/OfficerActivitiesTable";
import type { OfficerActivityItem } from "@/components/faculty-officer/officer-activities/types";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import OfficerActivityStatsCards from "@/components/faculty-officer/officer-activities/OfficerActivityStatsCards";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  status?: string;
  time?: string;
  termId?: string;
  page?: string;
}>;

type Row = {
  id: number;
  title: string;
  description: string | null;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  registration_status: string | null;
};
type SummaryRow = { total: number; upcoming: number; registered: number; attended: number };

const PAGE_SIZE = 10;

export default async function FacultyOfficerOfficerActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireOfficerParticipantContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const time = String(params.time ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = [
    "a.audience_type = 'officer'",
    "(NOT EXISTS(SELECT 1 FROM activity_scopes s WHERE s.activity_id=a.id) OR EXISTS(SELECT 1 FROM activity_scopes s JOIN class_members cm ON cm.class_id=s.class_id WHERE s.activity_id=a.id AND cm.user_id=? AND cm.left_at IS NULL))",
    "a.status = 'published'",
    "a.term_id = ?",
  ];
  const values: unknown[] = [user.id, selectedTerm.id];

  const summary = db.prepare(`
    SELECT COUNT(*) AS total,
      COUNT(CASE WHEN datetime(a.start_at)>datetime('now') THEN 1 END) AS upcoming,
      COUNT(CASE WHEN ar.status='registered' THEN 1 END) AS registered,
      COUNT(CASE WHEN ar.status='attended' THEN 1 END) AS attended
    FROM activities a LEFT JOIN activity_registrations ar ON ar.activity_id=a.id AND ar.user_id=?
    WHERE a.audience_type='officer' AND a.status='published' AND a.term_id=?
      AND (NOT EXISTS(SELECT 1 FROM activity_scopes s WHERE s.activity_id=a.id)
        OR EXISTS(SELECT 1 FROM activity_scopes s JOIN class_members cm ON cm.class_id=s.class_id WHERE s.activity_id=a.id AND cm.user_id=? AND cm.left_at IS NULL))
  `).get(user.id, selectedTerm.id, user.id) as SummaryRow;

  if (keyword) {
    where.push("(a.title LIKE ? OR a.description LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status === "registered") {
    where.push("ar.status IS NOT NULL");
  }

  if (status === "open") {
    where.push("ar.status IS NULL");
    where.push("datetime(a.registration_start_at) <= datetime('now')");
    where.push("datetime(a.registration_end_at) >= datetime('now')");
  }

  if (status === "attended") {
    where.push("ar.status = 'attended'");
  }

  if (status === "expired") {
    where.push("datetime(a.registration_end_at) < datetime('now')");
  }

  if (time === "upcoming") {
    where.push("datetime(a.start_at) > datetime('now')");
  }

  if (time === "ongoing") {
    where.push(
      "datetime(a.start_at) <= datetime('now') AND datetime(a.end_at) >= datetime('now')"
    );
  }

  if (time === "ended") {
    where.push("datetime(a.end_at) < datetime('now')");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM activities a
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      ${whereSql}
      `
    )
    .get(user.id, ...values) as { total: number };

  const rows = db
    .prepare(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.audience_type,
        a.status,
        a.start_at,
        a.end_at,
        a.registration_start_at,
        a.registration_end_at,
        a.conduct_score,
        ar.status AS registration_status
      FROM activities a
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      ${whereSql}
      ORDER BY datetime(a.start_at) DESC, a.id DESC
      LIMIT ?
      OFFSET ?
      `
    )
    .all(user.id, ...values, PAGE_SIZE, offset) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));

  const now = new Date();

  const items: OfficerActivityItem[] = rows.map((item) => {
    const regStart = new Date(item.registration_start_at);
    const regEnd = new Date(item.registration_end_at);

    return {
      id: Number(item.id),
      title: String(item.title ?? ""),
      description: item.description ? String(item.description) : "",
      audienceType: String(item.audience_type ?? ""),
      status: String(item.status ?? ""),
      startAt: String(item.start_at ?? ""),
      endAt: String(item.end_at ?? ""),
      registrationStartAt: String(item.registration_start_at ?? ""),
      registrationEndAt: String(item.registration_end_at ?? ""),
      conductScore: Number(item.conduct_score ?? 0),
      registrationStatus: item.registration_status
        ? String(item.registration_status)
        : null,
      canRegister:
        now >= regStart &&
        now <= regEnd &&
        !item.registration_status,
    };
  });

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Hoạt động cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <OfficerActivityStatsCards total={summary.total} upcoming={summary.upcoming} registered={summary.registered} attended={summary.attended} />

      <OfficerActivitiesTable
        items={items}
        page={page}
        totalPages={totalPages}
        totalResults={Number(total.total ?? 0)}
        basePath="/dashboard/faculty-officer/officer-activities"
        searchParams={{
          keyword,
          status,
          time,
          termId: String(selectedTerm.id),
        }}
      />
    </main>
  );
}
