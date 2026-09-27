import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import EventsHeader from "@/components/admin/events/EventsHeader";
import EventsTable from "@/components/admin/events/EventsTable";
import type { AdminEventItem } from "@/components/admin/events/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import { getEventSubmissionPhaseFilter } from "@/server/events/eventSubmissionPhaseFilter";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  status?: string;
  type?: string;
  phase?: string;
  termId?: string;
}>;

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  template_name: string | null;
  submissions: number;
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const type = String(params.type ?? "").trim();
  const phase = String(params.phase ?? "").trim();

  const where: string[] = [`e.term_id = ?`];
  const values: unknown[] = [selectedTerm.id];

  if (keyword) {
    where.push(`(e.title LIKE ? OR e.description LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push(`e.status = ?`);
    values.push(status);
  }

  if (type) {
    where.push(`e.type = ?`);
    values.push(type);
  }

  const phaseFilter = getEventSubmissionPhaseFilter(phase);
  if (phaseFilter) where.push(`(${phaseFilter})`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM events e
      LEFT JOIN criteria_templates ct ON ct.id = e.criteria_template_id
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

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
        ct.name AS template_name,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
        ) AS submissions
      FROM events e
      LEFT JOIN criteria_templates ct ON ct.id = e.criteria_template_id
      ${whereSql}
      ORDER BY datetime(e.start_at) DESC, e.id DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...values, pageSize, offset) as EventRow[];

  const items: AdminEventItem[] = rows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    type: String(item.type ?? ""),
    status: String(item.status ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    allowLate: Number(item.allow_late ?? 0) === 1,
    templateName: item.template_name ? String(item.template_name) : null,
    submissions: Number(item.submissions ?? 0),
  }));

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6">
      <EventsHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />
      {!selectedTerm.isActive ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Bạn đang xem học kỳ cũ. Dữ liệu chỉ nên xem lại, không thao tác tạo/sửa.
        </section>
      ) : null}

      <EventsTable
        items={items}
        canManage={selectedTerm.isActive}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        searchParams={{ keyword, status, type, phase, termId: String(selectedTerm.id) }}
      />
    </main>
  );
}
