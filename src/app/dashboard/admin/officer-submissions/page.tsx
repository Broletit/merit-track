import Link from "next/link";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import AdminOfficerSubmissionsFilter from "@/components/admin/officer-submissions/AdminOfficerSubmissionsFilter";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  status?: string;
  sort?: string;
  termId?: string;
  eventId?: string;
  page?: string;
}>;

type Row = {
  id: number;
  status: string;
  score_total: number;
  updated_at: string;
  submitted_at: string | null;
  event_title: string;
  officer_name: string;
  mssv: string;
};

type EventOption = {
  id: number;
  title: string;
};

const PAGE_SIZE = 10;

export default async function AdminOfficerSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const sort = String(params.sort ?? "latest").trim();
  const eventId = Number(params.eventId ?? 0);

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const eventOptions = db
    .prepare(
      `
      SELECT id, title
      FROM events
      WHERE term_id = ?
        AND type = 'officer'
        AND status = 'published'
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTerm.id) as EventOption[];

  const where: string[] = [
    "e.type = 'officer'",
    "e.term_id = ?",
    "s.status <> 'draft'",
    "s.submitted_at IS NOT NULL",
  ];

  const values: unknown[] = [selectedTerm.id];

  if (Number.isFinite(eventId) && eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }

  if (keyword) {
    where.push("(u.full_name LIKE ? OR u.mssv LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push("s.status = ?");
    values.push(status);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const orderSql =
    sort === "oldest"
      ? "datetime(s.updated_at) ASC, s.id ASC"
      : sort === "score_desc"
        ? "s.score_total DESC, datetime(s.updated_at) DESC, s.id DESC"
        : sort === "score_asc"
          ? "s.score_total ASC, datetime(s.updated_at) DESC, s.id DESC"
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
        COALESCE(s.score_total, 0) AS score_total,
        s.updated_at,
        s.submitted_at,
        e.title AS event_title,
        u.full_name AS officer_name,
        u.mssv
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
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

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Hồ sơ cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Danh sách hồ sơ cán bộ
          </h2>
        </div>

        <div className="mt-5">
          <AdminOfficerSubmissionsFilter
            eventOptions={eventOptions}
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Cán bộ
                </th>
                <th className="w-[10%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Điểm
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Ngày gửi
                </th>
                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length > 0 ? (
                rows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                      {item.event_title}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-sm font-medium text-slate-800">
                        {item.officer_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.mssv}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {Number(item.score_total ?? 0)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <SubmissionStatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {item.submitted_at
                        ? formatDateTimeVN(item.submitted_at)
                        : "-"}
                    </td>

                    <td className="px-4 py-4 text-center align-top">
                      <Link
                        href={`/dashboard/admin/officer-submissions/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Không có hồ sơ cán bộ phù hợp.
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
            basePath="/dashboard/admin/officer-submissions"
            searchParams={{
              keyword,
              status,
              sort,
              termId: String(selectedTerm.id),
              eventId: eventId > 0 ? String(eventId) : "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
