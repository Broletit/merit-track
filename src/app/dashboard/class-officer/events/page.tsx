import Link from "next/link";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import ClassEventsFilter from "@/components/class-officer/events/ClassEventsFilter";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import { getEventSubmissionPhaseFilter } from "@/server/events/eventSubmissionPhaseFilter";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  status?: string;
  phase?: string;
  termId?: string;
  page?: string;
}>;

type Row = {
  id: number;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  total_submissions: number;
  submitted_v1: number;
  submitted_v2: number;
  needs_revision_v1: number;
  passed: number;
  failed: number;
};

const PAGE_SIZE = 10;

export default async function ClassOfficerEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireClassOfficerContext();
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
      LIMIT 1
      `
    )
    .get(user.id) as { class_id: number } | undefined;

  if (!officerClass) {
    throw new Error("Tài khoản cán bộ lớp chưa được gán lớp.");
  }

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const phase = String(params.phase ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = [
    "e.type = 'student'",
    "e.status = 'published'",
    "e.term_id = ?",
    `(NOT EXISTS (SELECT 1 FROM event_scopes es WHERE es.event_id=e.id)
      OR EXISTS (SELECT 1 FROM event_scopes es WHERE es.event_id=e.id AND es.class_id=?))`,
  ];
  const values: unknown[] = [selectedTerm.id, officerClass.class_id];

  if (keyword) {
    where.push("(e.title LIKE ? OR e.description LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM submissions sx
        WHERE sx.event_id = e.id
          AND sx.class_id = ?
          AND sx.status = ?
      )
    `);
    values.push(officerClass.class_id, status);
  }

  const phaseFilter = getEventSubmissionPhaseFilter(phase);
  if (phaseFilter) where.push(`(${phaseFilter})`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM events e
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
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
            AND s.class_id = ?
            AND s.status <> 'draft'
        ) AS total_submissions,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
            AND s.class_id = ?
            AND s.status = 'submitted_v1'
        ) AS submitted_v1,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
            AND s.class_id = ?
            AND s.status = 'submitted_v2'
        ) AS submitted_v2,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
            AND s.class_id = ?
            AND s.status = 'needs_revision_v1'
        ) AS needs_revision_v1,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
            AND s.class_id = ?
            AND s.status = 'passed'
        ) AS passed,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
            AND s.class_id = ?
            AND s.status = 'failed'
        ) AS failed
      FROM events e
      ${whereSql}
      ORDER BY datetime(e.start_at) DESC, e.id DESC
      LIMIT ?
      OFFSET ?
      `
    )
    .all(
      officerClass.class_id,
      officerClass.class_id,
      officerClass.class_id,
      officerClass.class_id,
      officerClass.class_id,
      officerClass.class_id,
      ...values,
      PAGE_SIZE,
      offset
    ) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Đợt xét</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Danh sách đợt xét</h2>

        <div className="mt-5">
          <ClassEventsFilter />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét</th>
                <th className="w-[15%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Thời gian</th>
                <th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Nhận hồ sơ</th>
                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Tổng</th>
                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Vòng 1</th>
                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Vòng 2</th>
                <th className="w-[9%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Đạt</th>
                <th className="w-[7%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Xem</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length > 0 ? (
                rows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.title}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatDateTimeVN(item.start_at)}
                    </td>
                    <td className="px-4 py-4">
                      <EventSubmissionPhaseBadge
                        event={{
                          status: item.status,
                          startAt: item.start_at,
                          endAt: item.end_at,
                          allowLate: Boolean(item.allow_late),
                        }}
                      />
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">{item.total_submissions}</td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-amber-700">{item.submitted_v1}</td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-blue-700">{item.submitted_v2}</td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-emerald-700">{item.passed}</td>
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/dashboard/class-officer/events/${item.id}?termId=${selectedTerm.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không có đợt xét phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <ReviewPagination
            page={page}
            totalPages={totalPages}
            basePath="/dashboard/class-officer/events"
            searchParams={{ keyword, status, phase, termId: String(selectedTerm.id) }}
          />
        </div>
      </section>
    </main>
  );
}
