import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ActivitiesHeader from "@/components/admin/activities/ActivitiesHeader";
import ActivitiesTable from "@/components/admin/activities/ActivitiesTable";
import type { AdminActivityItem } from "@/components/admin/activities/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  status?: string;
  audience?: string;
  checkin?: string;
  time?: string;
  termId?: string;
}>;

type ActivityRow = {
  id: number;
  title: string;
  description: string;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  qr_checkin_enabled: number;
  participants: number;
  attended: number;
};

export default async function AdminActivitiesPage({
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
  const audience = String(params.audience ?? "").trim();
  const checkin = String(params.checkin ?? "").trim();
  const time = String(params.time ?? "").trim();

  const where: string[] = [`a.term_id = ?`];
  const values: unknown[] = [selectedTerm.id];

  if (keyword) {
    where.push(`(a.title LIKE ? OR a.description LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push(`a.status = ?`);
    values.push(status);
  }

  if (audience) {
    where.push(`a.audience_type = ?`);
    values.push(audience);
  }

  if (checkin === "qr") where.push(`a.qr_checkin_enabled = 1`);
  if (checkin === "manual") where.push(`a.qr_checkin_enabled = 0`);
  if (time === "upcoming") where.push(`datetime(a.start_at) > datetime('now')`);
  if (time === "ongoing") {
    where.push(
      `datetime(a.start_at) <= datetime('now') AND datetime(a.end_at) >= datetime('now')`
    );
  }
  if (time === "ended") where.push(`datetime(a.end_at) < datetime('now')`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM activities a
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

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
        a.qr_checkin_enabled,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
        ) AS participants,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.status = 'attended'
        ) AS attended
      FROM activities a
      ${whereSql}
      ORDER BY datetime(a.start_at) DESC, a.id DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...values, pageSize, offset) as ActivityRow[];

  const items: AdminActivityItem[] = rows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    audienceType: String(item.audience_type ?? ""),
    status: String(item.status ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    registrationStartAt: String(item.registration_start_at ?? ""),
    registrationEndAt: String(item.registration_end_at ?? ""),
    conductScore: Number(item.conduct_score ?? 0),
    qrCheckinEnabled: Number(item.qr_checkin_enabled ?? 0) === 1,
    participants: Number(item.participants ?? 0),
    attended: Number(item.attended ?? 0),
  }));

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6">
      <ActivitiesHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />
      {!selectedTerm.isActive ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Bạn đang xem học kỳ cũ. Dữ liệu chỉ nên xem lại, không thao tác tạo/sửa.
        </section>
      ) : null}
      <ActivitiesTable items={items} canManage={selectedTerm.isActive} />

      <Pagination
        page={page}
        totalPages={totalPages}
        searchParams={{ keyword, status, audience, checkin, time, termId: String(selectedTerm.id) }}
      />
    </main>
  );
}
