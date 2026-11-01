import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import AdminOfficerReviewsTable from "@/components/admin/officer-reviews/AdminOfficerReviewsTable";
import type { AdminOfficerReviewRow } from "@/components/admin/officer-reviews/AdminOfficerReviewsTable";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
  page?: string;
  keyword?: string;
  termId?: string;
  eventId?: string;
  status?: string;
  sort?: string;
}>;

type Row = {
  id: number;
  event_title: string;
  officer_name: string;
  officer_code: string;
  class_code: string;
  score_total: number;
  event_score_max: number | null;
  status: string;
  updated_at: string | null;
  submitted_at: string | null;
  event_end_at: string;
  reviewer_name: string | null;
  last_review_note: string | null;
  revision_count: number;
  total_criteria: number;
  completed_criteria: number;
};

const PAGE_SIZE = 10;

export default async function AdminOfficerReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDatabase();
  

  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));
  const selectedTermId = selectedTerm.id;

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const sort = String(params.sort ?? "priority").trim();

  const where: string[] = [`e.type = 'officer'`, `e.term_id = ?`, `s.status <> 'draft'`, `s.submitted_at IS NOT NULL`];
  const values: unknown[] = [selectedTermId];

  if (keyword) {
    where.push(`((LOCATE(LOWER(?), LOWER(u.full_name)) > 0) OR (LOCATE(LOWER(?), LOWER(u.mssv)) > 0) OR (LOCATE(LOWER(?), LOWER(e.title)) > 0))`);
    values.push(keyword, keyword, keyword);
  }

  if (status) { where.push(`s.status = ?`); values.push(status); }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const orderSql =
    sort === "score_desc"
      ? `s.score_total DESC, CAST(s.updated_at AS DATETIME(3)) DESC, s.id DESC`
      : sort === "score_asc"
        ? `s.score_total ASC, CAST(s.updated_at AS DATETIME(3)) DESC, s.id DESC`
        : sort === "oldest"
      ? `CAST(s.updated_at AS DATETIME(3)) ASC, s.id ASC`
      : sort === "latest"
        ? `CAST(s.updated_at AS DATETIME(3)) DESC, s.id DESC`
        : `
          CASE
            WHEN s.status = 'submitted_v1'
              AND CAST(e.end_at AS DATETIME(3)) >= CURRENT_TIMESTAMP(3) THEN 0
            WHEN s.status = 'submitted_v1'
              AND CAST(e.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3) THEN 1
            WHEN s.status = 'needs_revision_v1' THEN 2
            ELSE 3
          END ASC,
          CAST(e.end_at AS DATETIME(3)) ASC,
          CAST(s.updated_at AS DATETIME(3)) ASC,
          s.id ASC
        `;

  const totalRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        s.id,
        e.title AS event_title,
        u.full_name AS officer_name,
        u.mssv AS officer_code,
        COALESCE(
          c.code,
          (
            SELECT member_class.code
            FROM class_members membership
            INNER JOIN classes member_class ON member_class.id = membership.class_id
            WHERE membership.user_id = s.user_id
              AND membership.left_at IS NULL
            ORDER BY CAST(membership.joined_at AS DATETIME(3)) DESC, membership.id DESC
            LIMIT 1
          ),
          '—'
        ) AS class_code,
        s.score_total,
        e.score_max AS event_score_max,
        s.status,
        s.updated_at,
        s.submitted_at,
        e.end_at AS event_end_at,

        (
          SELECT ru.full_name
          FROM reviews r
          LEFT JOIN users ru ON ru.id = r.reviewer_id
          WHERE r.submission_id = s.id
          ORDER BY CAST(r.created_at AS DATETIME(3)) DESC, r.id DESC
          LIMIT 1
        ) AS reviewer_name,

        (
          SELECT r.note
          FROM reviews r
          WHERE r.submission_id = s.id
          ORDER BY CAST(r.created_at AS DATETIME(3)) DESC, r.id DESC
          LIMIT 1
        ) AS last_review_note,

        (
          SELECT COUNT(*)
          FROM reviews r
          WHERE r.submission_id = s.id
            AND r.decision = 'revise'
        ) AS revision_count,

        (
          SELECT COUNT(*)
          FROM criteria_template_items cti
          WHERE cti.template_id = e.criteria_template_id
        ) AS total_criteria,

        (
          SELECT COUNT(*)
          FROM criteria_template_items cti
          WHERE cti.template_id = e.criteria_template_id
            AND (
              s.status != 'draft'
              OR
              EXISTS (
                SELECT 1
                FROM submission_auto_results sar
                WHERE sar.submission_id = s.id
                  AND sar.criteria_code = cti.code
                  AND sar.passed = 1
              )
              OR EXISTS (
                SELECT 1
                FROM submission_items si
                WHERE si.submission_id = s.id
                  AND si.criteria_code = cti.code
                  AND TRIM(COALESCE(si.content_text, '')) <> ''
              )
              OR EXISTS (
                SELECT 1
                FROM submission_ready_files sf
                WHERE sf.submission_id = s.id
                  AND sf.criteria_code = cti.code
              )
            )
        ) AS completed_criteria

      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
      `, [...values, PAGE_SIZE, offset])) as Row[];

  const items: AdminOfficerReviewRow[] = rows.map((item) => ({
    id: Number(item.id),
    eventTitle: String(item.event_title ?? ""),
    officerName: String(item.officer_name ?? ""),
    officerCode: String(item.officer_code ?? ""),
    classCode: String(item.class_code ?? ""),
    scoreTotal: Number(item.score_total ?? 0),
    scoreMax: Number(item.event_score_max ?? 0),
    status: String(item.status ?? ""),
    updatedAt: item.updated_at ? String(item.updated_at) : null,
    submittedAt: item.submitted_at ? String(item.submitted_at) : null,
    eventEndAt: String(item.event_end_at ?? ""),
    reviewerName: item.reviewer_name ? String(item.reviewer_name) : null,
    lastReviewNote: item.last_review_note
      ? String(item.last_review_note)
      : null,
    revisionCount: Number(item.revision_count ?? 0),
    totalCriteria: Number(item.total_criteria ?? 0),
    completedCriteria: Number(item.completed_criteria ?? 0),
  }));

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Duyệt hồ sơ cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTermId} />
        </div>
      </section>

      <div data-table-frame className="min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<AdminOfficerReviewsTable page={page}
        items={items}
      />
<Pagination totalResults={total} resultLabel="hồ sơ"
        page={page}
        totalPages={totalPages}
        searchParams={{
          keyword,
          termId: String(selectedTermId),
          status,
          sort,
        }}
      />
</div>
    </main>
  );
}
