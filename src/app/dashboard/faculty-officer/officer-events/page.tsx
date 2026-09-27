import Link from "next/link";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import OfficerEventsFilter from "@/components/faculty-officer/officer-events/OfficerEventsFilter";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import { getEventSubmissionPhaseFilter } from "@/server/events/eventSubmissionPhaseFilter";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  keyword?: string;
  submission?: string;
  phase?: string;
  page?: string;
  termId?: string;
}>;

type Row = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  submission_id: number | null;
  submission_status: string | null;
};

const PAGE_SIZE = 10;

export async function OfficerEventsPageView({
  searchParams,
  basePath,
}: {
  searchParams: SearchParams;
  basePath: string;
}) {
  const user = await requireOfficerParticipantContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const keyword = String(params.keyword ?? "").trim();
  const submission = String(params.submission ?? "").trim();
  const phase = String(params.phase ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = ["e.type = 'officer'", "e.status = 'published'", "e.term_id = ?"];
  const values: unknown[] = [selectedTerm.id];

  if (keyword) {
    where.push("(e.title LIKE ? OR e.description LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (submission === "created") {
    where.push("s.id IS NOT NULL");
  }

  if (submission === "not_created") {
    where.push("s.id IS NULL");
  }

  const phaseFilter = getEventSubmissionPhaseFilter(phase);
  if (phaseFilter) where.push(`(${phaseFilter})`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM events e
      LEFT JOIN submissions s
        ON s.event_id = e.id
       AND s.user_id = ?
      ${whereSql}
      `
    )
    .get(user.id, ...values) as { total: number };

  const rows = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        s.id AS submission_id,
        s.status AS submission_status
      FROM events e
      LEFT JOIN submissions s
        ON s.event_id = e.id
       AND s.user_id = ?
      ${whereSql}
      ORDER BY datetime(e.start_at) DESC, e.id DESC
      LIMIT ?
      OFFSET ?
      `
    )
    .all(user.id, ...values, PAGE_SIZE, offset) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Đợt xét cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Danh sách đợt xét</h2>

        <div className="mt-5">
          <OfficerEventsFilter />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[26%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Thời gian nộp
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Nhận hồ sơ
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Hồ sơ
                </th>
                <th className="w-[18%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
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
                        {item.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {item.description || "Chưa có mô tả"}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDateTimeVN(item.start_at)}
                      <div className="mt-1 text-xs text-slate-500">đến</div>
                      {formatDateTimeVN(item.end_at)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <EventSubmissionPhaseBadge
                        event={{
                          status: item.status,
                          startAt: item.start_at,
                          endAt: item.end_at,
                          allowLate: Number(item.allow_late ?? 0) === 1,
                        }}
                      />
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {item.submission_id ? "Đã tạo hồ sơ" : "Chưa tạo"}
                    </td>

                    <td className="px-4 py-4 text-center align-top">
                      <Link
                        href={`${basePath}/${item.id}`}
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
                    Không có đợt xét cán bộ phù hợp.
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
              submission,
              phase,
              termId: String(selectedTerm.id),
            }}
          />
        </div>
      </section>
    </main>
  );
}

export default async function OfficerEventsPage(props: { searchParams: SearchParams }) {
  return <OfficerEventsPageView {...props} basePath="/dashboard/faculty-officer/officer-events" />;
}
