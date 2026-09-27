import Link from "next/link";
import { FileText } from "lucide-react";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import SubmissionTableFilters from "@/components/shared/submissions/SubmissionTableFilters";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { getSubmissionStatusLabel } from "@/lib/submissions/submissionStatus";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  termId?: string;
  eventId?: string;
  status?: string;
}>;

type Row = {
  id: number;
  status: string;
  updated_at: string;
  event_title: string;
};

type EventOption = {
  id: number;
  title: string;
};

const PAGE_SIZE = 10;

const statusOptions = [
  { value: "submitted_v1", label: "Chờ duyệt vòng 1" },
  { value: "submitted_v2", label: "Chờ duyệt vòng 2" },
  { value: "needs_revision_v1", label: "Cần chỉnh sửa" },
  { value: "needs_revision_v2", label: "Cần chỉnh sửa" },
  { value: "passed", label: "Đã đạt" },
  { value: "approved", label: "Đã đạt" },
  { value: "failed", label: "Không đạt" },
];

export default async function StudentSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const eventId = Number(params.eventId ?? 0);
  const status = String(params.status ?? "").trim();

  const eventOptions = db
    .prepare(
      `
      SELECT DISTINCT e.id, e.title
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.user_id = ?
        AND e.term_id = ?
        AND s.submitted_at IS NOT NULL
      ORDER BY datetime(e.start_at) DESC, e.id DESC
      `
    )
    .all(user.id, selectedTerm.id) as EventOption[];

  const where: string[] = [
    "s.user_id = ?",
    "e.term_id = ?",
    "s.submitted_at IS NOT NULL",
  ];
  const values: unknown[] = [user.id, selectedTerm.id];

  if (keyword) {
    where.push("(u.full_name LIKE ? OR u.mssv LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (Number.isFinite(eventId) && eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }

  if (status) {
    where.push("s.status = ?");
    values.push(status);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = db
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
        s.updated_at,
        e.title AS event_title
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      ${whereSql}
      ORDER BY datetime(s.updated_at) DESC, s.id DESC
      LIMIT ?
      OFFSET ?
      `
    )
    .all(...values, PAGE_SIZE, offset) as Row[];

  const totalPages = Math.max(
    1,
    Math.ceil(Number(totalRow.total ?? 0) / PAGE_SIZE)
  );

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Hồ sơ xét của tôi</h1>
          </div>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <SubmissionTableFilters
          eventOptions={eventOptions}
          statusOptions={statusOptions}
        />

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[42%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Cập nhật
                </th>
                <th className="w-[16%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length > 0 ? (
                rows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {item.event_title}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {getSubmissionStatusLabel(item.status)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatDateTimeVN(item.updated_at)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/dashboard/student/submissions/${item.id}`}
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
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Không có hồ sơ phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <Pagination
            page={page}
            totalPages={totalPages}
            searchParams={{
              keyword,
              termId: String(selectedTerm.id),
              eventId: eventId > 0 ? String(eventId) : "",
              status,
            }}
          />
        </div>
      </section>
    </main>
  );
}
