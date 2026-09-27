import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import AdminOfficerReviewsTable from "@/components/admin/officer-reviews/AdminOfficerReviewsTable";
import type { AdminOfficerReviewRow } from "@/components/admin/officer-reviews/AdminOfficerReviewsTable";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  termId?: string;
  eventId?: string;
  queue?: string;
  sort?: string;
}>;

type EventOptionRow = {
  id: number;
  title: string;
};

type Row = {
  id: number;
  event_title: string;
  officer_name: string;
  officer_code: string;
  class_code: string;
  score_total: number;
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
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const selectedTermId = selectedTerm.id;

  const eventOptionRows = db
    .prepare(
      `
      SELECT id, title
      FROM events
      WHERE type = 'officer'
        AND term_id = ?
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTermId) as EventOptionRow[];

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const eventId = Number(params.eventId ?? 0);
  const queue = String(params.queue ?? "").trim();
  const sort = String(params.sort ?? "priority").trim();

  const where: string[] = [`e.type = 'officer'`, `e.term_id = ?`];
  const values: unknown[] = [selectedTermId];

  if (Number.isFinite(eventId) && eventId > 0) {
    where.push(`e.id = ?`);
    values.push(eventId);
  }

  if (keyword) {
    where.push(`(u.full_name LIKE ? OR u.mssv LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (queue === "need_action") {
    where.push(`
      s.status = 'submitted_v1'
      AND datetime(e.end_at) >= datetime('now')
    `);
  } else if (queue === "waiting_update") {
    where.push(`s.status = 'needs_revision_v1'`);
  } else if (queue === "overdue") {
    where.push(`
      s.status = 'submitted_v1'
      AND datetime(e.end_at) < datetime('now')
    `);
  } else {
    where.push(`s.status IN ('submitted_v1', 'needs_revision_v1')`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const orderSql =
    sort === "oldest"
      ? `datetime(s.updated_at) ASC, s.id ASC`
      : sort === "latest"
        ? `datetime(s.updated_at) DESC, s.id DESC`
        : `
          CASE
            WHEN s.status = 'submitted_v1'
              AND datetime(e.end_at) >= datetime('now') THEN 0
            WHEN s.status = 'submitted_v1'
              AND datetime(e.end_at) < datetime('now') THEN 1
            WHEN s.status = 'needs_revision_v1' THEN 2
            ELSE 3
          END ASC,
          datetime(e.end_at) ASC,
          datetime(s.updated_at) ASC,
          s.id ASC
        `;

  const totalRow = db
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
        e.title AS event_title,
        u.full_name AS officer_name,
        u.mssv AS officer_code,
        c.code AS class_code,
        s.score_total,
        s.status,
        s.updated_at,
        s.submitted_at,
        e.end_at AS event_end_at,

        (
          SELECT ru.full_name
          FROM reviews r
          LEFT JOIN users ru ON ru.id = r.reviewer_id
          WHERE r.submission_id = s.id
          ORDER BY datetime(r.created_at) DESC, r.id DESC
          LIMIT 1
        ) AS reviewer_name,

        (
          SELECT r.note
          FROM reviews r
          WHERE r.submission_id = s.id
          ORDER BY datetime(r.created_at) DESC, r.id DESC
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
                FROM submission_files sf
                WHERE sf.submission_id = s.id
                  AND sf.criteria_code = cti.code
              )
            )
        ) AS completed_criteria

      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
      `
    )
    .all(...values, PAGE_SIZE, offset) as Row[];

  const items: AdminOfficerReviewRow[] = rows.map((item) => ({
    id: Number(item.id),
    eventTitle: String(item.event_title ?? ""),
    officerName: String(item.officer_name ?? ""),
    officerCode: String(item.officer_code ?? ""),
    classCode: String(item.class_code ?? ""),
    scoreTotal: Number(item.score_total ?? 0),
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
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Duyệt hồ sơ cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTermId} />
        </div>
      </section>

      <AdminOfficerReviewsTable
        items={items}
        eventOptions={eventOptionRows.map((item) => ({
          id: Number(item.id),
          title: String(item.title ?? ""),
        }))}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        searchParams={{
          keyword,
          termId: String(selectedTermId),
          eventId: Number.isFinite(eventId) && eventId > 0 ? String(eventId) : "",
          queue,
          sort,
        }}
      />
    </main>
  );
}
