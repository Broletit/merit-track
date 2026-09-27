import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import ClassOfficerReviewsTable from "@/components/class-officer/reviews/ClassOfficerReviewsTable";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  status?: string;
  sort?: string;
  termId?: string;
  page?: string;
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

export default async function ClassOfficerReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const officer = await requireClassOfficerContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const officerClass = db
    .prepare(
      `
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
      ORDER BY rowid DESC
      LIMIT 1
      `
    )
    .get(officer.id) as { class_id: number } | undefined;

  if (!officerClass) {
    throw new Error("Tài khoản cán bộ lớp chưa được gán lớp.");
  }

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "submitted_v1").trim();
  const sort = String(params.sort ?? "latest").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = [
    "s.class_id = ?",
    "e.term_id = ?",
    "e.status = 'published'",
    "datetime(e.end_at) >= datetime('now')",
  ];
  const values: unknown[] = [officerClass.class_id, selectedTerm.id];

  if (status) {
    if (status === "rejected") {
      where.push("s.status = 'rejected'");
    } else {
      where.push("s.status = ?");
      values.push(status);
    }
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
        s.updated_at AS submitted_at
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

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Duyệt hồ sơ vòng 1</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <ClassOfficerReviewsTable
        items={items}
        page={page}
        totalPages={totalPages}
        searchParams={{
          keyword,
          status,
          sort,
          termId: String(selectedTerm.id),
        }}
      />
    </main>
  );
}
