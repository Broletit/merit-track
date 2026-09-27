import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import FacultyOfficerReviewsTable from "@/components/faculty-officer/reviews/FacultyOfficerReviewsTable";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  sort?: string;
  class?: string;
  page?: string;
  termId?: string;
  eventId?: string;
}>;

type Row = {
  id: number;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string;
  status: string;
  submitted_at: string | null;
};

const PAGE_SIZE = 10;

export default async function FacultyOfficerReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const officer = await requireFacultyOfficerContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const keyword = String(params.keyword ?? "").trim();
  const sort = String(params.sort ?? "latest").trim();
  const classCode = String(params.class ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const eventId = Number(params.eventId ?? 0);

  const classRows = db
    .prepare(
      `
      SELECT DISTINCT c.code
      FROM faculty_class_assignments fca
      INNER JOIN classes c ON c.id = fca.class_id
      WHERE fca.faculty_officer_id = ?
        AND c.is_active = 1
      ORDER BY c.code ASC
      `
    )
    .all(officer.id) as { code: string }[];

  const classOptions = classRows.map((item) => String(item.code));

  const where: string[] = [
    "s.status = 'submitted_v2'",
    "e.term_id = ?",
    `
    EXISTS (
      SELECT 1
      FROM faculty_class_assignments fca
      WHERE fca.faculty_officer_id = ?
        AND fca.class_id = s.class_id
    )
    `,
  ];

  const values: unknown[] = [selectedTerm.id, officer.id];

  if (Number.isFinite(eventId) && eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }

  if (classCode) {
    where.push("c.code = ?");
    values.push(classCode);
  }

  if (keyword) {
    where.push("(e.title LIKE ? OR u.full_name LIKE ? OR u.mssv LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const orderSql =
    sort === "oldest"
      ? "datetime(s.updated_at) ASC, s.id ASC"
      : "datetime(s.updated_at) DESC, s.id DESC";

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

  const rows = db
    .prepare(
      `
      SELECT
        s.id,
        s.status,
        e.title AS event_title,
        u.full_name AS student_name,
        u.mssv,
        c.code AS class_code,
        COALESCE(s.submitted_at, s.updated_at) AS submitted_at
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ?
      OFFSET ?
      `
    )
    .all(...values, PAGE_SIZE, offset) as Row[];

  const totalPages = Math.max(
    1,
    Math.ceil(Number(total.total ?? 0) / PAGE_SIZE)
  );

  const items = rows.map((item) => ({
    id: Number(item.id),
    eventTitle: String(item.event_title ?? ""),
    studentName: String(item.student_name ?? ""),
    studentCode: String(item.mssv ?? ""),
    classCode: String(item.class_code ?? ""),
    status: String(item.status ?? ""),
    submittedAt: item.submitted_at ? String(item.submitted_at) : null,
  }));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Duyệt hồ sơ vòng 2</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id}/></div>
      </section>

      <FacultyOfficerReviewsTable
        items={items}
        totalResults={Number(total.total ?? 0)}
        page={page}
        totalPages={totalPages}
        classOptions={classOptions}
        searchParams={{
          keyword,
          sort,
          class: classCode,
          termId: String(selectedTerm.id),
          eventId: eventId > 0 ? String(eventId) : "",
        }}
      />
    </main>
  );
}
