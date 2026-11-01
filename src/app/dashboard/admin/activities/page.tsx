import { activityCohortSql } from "@/server/cohorts/sql";
import { parseCohort } from "@/lib/cohorts/cohorts";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ActivitiesHeader from "@/components/admin/activities/ActivitiesHeader";
import ActivitiesTable from "@/components/admin/activities/ActivitiesTable";
import type { AdminActivityItem } from "@/components/admin/activities/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
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
  absence_penalty: number;
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
  const db = getDatabase();

  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

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
  const cohort = parseCohort(params.cohort);
  if (params.cohort && !cohort) where.push("0=1");
  if (cohort) { where.push(`(${activityCohortSql("a")})`); values.push(cohort,cohort); }

  if (keyword) {
    where.push(`a.title LIKE ?`);
    values.push(`%${keyword}%`);
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
  if (time === "upcoming") where.push(`CAST(a.start_at AS DATETIME(3)) > CURRENT_TIMESTAMP(3)`);
  if (time === "ongoing") {
    where.push(
      `CAST(a.start_at AS DATETIME(3)) <= CURRENT_TIMESTAMP(3) AND CAST(a.end_at AS DATETIME(3)) >= CURRENT_TIMESTAMP(3)`
    );
  }
  if (time === "ended") where.push(`CAST(a.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM activities a
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
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
        a.absence_penalty,
        a.qr_checkin_enabled,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.status != 'cancelled'
        ) AS participants,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.status = 'attended'
        ) AS attended
      FROM activities a
      ${whereSql}
      ORDER BY CAST(a.start_at AS DATETIME(3)) DESC, a.id DESC
      LIMIT ? OFFSET ?
      `, [...values, pageSize, offset])) as ActivityRow[];

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
    absencePenalty: Number(item.absence_penalty ?? 0),
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
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100 shadow-md shadow-slate-200/60">
          Bạn đang xem học kỳ cũ. Dữ liệu chỉ nên xem lại, không thao tác tạo/sửa.
        </section>
      ) : null}
      <div data-table-frame className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md shadow-slate-200/60">
<ActivitiesTable page={page} items={items} canManage={selectedTerm.isActive} />
<Pagination totalResults={total} resultLabel="hoạt động"
        page={page}
        totalPages={totalPages}
        searchParams={{ cohort: params.cohort, keyword, status, audience, checkin, time, termId: String(selectedTerm.id) }}
      />
</div>
    </main>
  );
}
