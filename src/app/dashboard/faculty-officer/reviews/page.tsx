import { cohortClause } from "@/server/cohorts/sql";
import { addCohortFilter } from "@/server/cohorts/sql";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import FacultyOfficerReviewsTable from "@/components/faculty-officer/reviews/FacultyOfficerReviewsTable";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
  keyword?: string;
  sort?: string;
  class?: string;
  page?: string;
  termId?: string;
  eventId?: string;
  round?: string;
  status?: string;
}>;

type Row = {
  id: number;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string;
  status: string;
  submitted_at: string | null;
  review_round: number;
};

const PAGE_SIZE = 10;

export default async function FacultyOfficerReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const officer = await requireFacultyOfficerContext();
  const params = await searchParams;
  const db = getDatabase();
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const keyword = String(params.keyword ?? "").trim();
  const sort = String(params.sort ?? "latest").trim();
  const classCode = String(params.class ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const eventId = Number(params.eventId ?? 0);
  const status = String(params.status ?? "").trim();

  const classRows = (await db.rows(`
      SELECT DISTINCT c.code
      FROM faculty_class_assignments fca
      INNER JOIN classes c ON c.id = fca.class_id
      WHERE fca.faculty_officer_id = ?
        AND c.is_active = 1 AND ${cohortClause(params.cohort, "c.cohort")}
      ORDER BY c.code ASC
      `, [officer.id])) as { code: string }[];

  const classOptions = classRows.map((item) => String(item.code));
  const eventOptions = (await db.rows(`SELECT DISTINCT e.id,e.title,e.start_at FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE e.term_id=? AND e.type='student' AND s.submitted_at IS NOT NULL AND EXISTS(SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=? AND fca.class_id=s.class_id) ORDER BY CAST(e.start_at AS DATETIME(3)) DESC`, [selectedTerm.id, officer.id])) as Array<{id:number;title:string}>;

  const where: string[] = [
    "s.submitted_at IS NOT NULL",
    "e.term_id = ?",
    "e.type = 'student'",
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
  addCohortFilter(where,values,params.cohort,"u.cohort");

  if (Number.isFinite(eventId) && eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }
  if (status) { where.push("s.status = ?"); values.push(status); }

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
      ? "CAST(s.updated_at AS DATETIME(3)) ASC, s.id ASC"
      : "CAST(s.updated_at AS DATETIME(3)) DESC, s.id DESC";

  const total = (await db.first(`
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        s.id,
        s.status,
        e.title AS event_title,
        u.full_name AS student_name,
        u.mssv,
        c.code AS class_code,
        s.review_round,
        COALESCE(s.submitted_at, s.updated_at) AS submitted_at
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ?
      OFFSET ?
      `, [...values, PAGE_SIZE, offset])) as Row[];

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
    reviewRound: Number(item.review_round),
  }));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Duyệt hồ sơ</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id}/></div>
      </section>

      <FacultyOfficerReviewsTable
        items={items}
        totalResults={Number(total.total ?? 0)}
        page={page}
        totalPages={totalPages}
        classOptions={classOptions}
        eventOptions={eventOptions}
        searchParams={{ cohort: params.cohort,
          keyword,
          sort,
          class: classCode,
          termId: String(selectedTerm.id),
          eventId: eventId > 0 ? String(eventId) : "",
          status,
        }}
      />
    </main>
  );
}
