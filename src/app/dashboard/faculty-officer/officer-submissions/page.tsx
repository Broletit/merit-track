import Link from "next/link";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import OfficerSubmissionsFilter from "@/components/faculty-officer/officer-submissions/OfficerSubmissionsFilter";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  status?: string;
  sort?: string;
  page?: string;
  termId?: string;
}>;

type Row = {
  id: number;
  status: string;
  updated_at: string;
  event_id: number;
  event_title: string;
  event_start_at: string;
  event_end_at: string;
};

const PAGE_SIZE = 10;

export async function OfficerSubmissionsPageView({
  searchParams,
  basePath,
  eventsPath,
}: {
  searchParams: SearchParams;
  basePath: string;
  eventsPath: string;
}) {
  const user = await requireOfficerParticipantContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const sort = String(params.sort ?? "latest").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = ["s.user_id = ?", "e.type = 'officer'", "e.term_id = ?"];
  const values: unknown[] = [user.id, selectedTerm.id];

  if (keyword) {
    where.push("(e.title LIKE ? OR e.description LIKE ?)");
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
      : "datetime(s.updated_at) DESC, s.id DESC";

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
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
        s.updated_at,
        e.id AS event_id,
        e.title AS event_title,
        e.start_at AS event_start_at,
        e.end_at AS event_end_at
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ?
      OFFSET ?
      `
    )
    .all(...values, PAGE_SIZE, offset) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Hồ sơ xét cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Danh sách hồ sơ</h2>

          <Link
            href={eventsPath}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Xem đợt xét cán bộ
          </Link>
        </div>

        <div className="mt-5">
          <OfficerSubmissionsFilter />
        </div>

        <div className="mt-4 text-sm font-medium text-slate-600">
          Tìm thấy {Number(total.total ?? 0)} hồ sơ
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[34%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Thời gian nộp
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Cập nhật
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
                    <td className="px-4 py-4 align-top">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.event_title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Mã hồ sơ #{item.id}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <SubmissionStatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDateTimeVN(item.event_start_at)}
                      <div className="mt-1 text-xs text-slate-500">đến</div>
                      {formatDateTimeVN(item.event_end_at)}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDateTimeVN(item.updated_at)}
                    </td>

                    <td className="px-4 py-4 text-center align-top">
                      <Link
                        href={`${basePath}/detail/${item.id}`}
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
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Chưa có hồ sơ xét cán bộ nào.
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
            basePath={basePath}
            searchParams={{
              keyword,
              status,
              sort,
              termId: String(selectedTerm.id),
            }}
          />
        </div>
      </section>
    </main>
  );
}

export default async function OfficerSubmissionsPage(props: { searchParams: SearchParams }) {
  return <OfficerSubmissionsPageView {...props} basePath="/dashboard/faculty-officer/officer-submissions" eventsPath="/dashboard/faculty-officer/officer-events" />;
}
