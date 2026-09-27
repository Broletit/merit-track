import Link from "next/link";
import { FileText } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import SubmissionTableFilters from "@/components/shared/submissions/SubmissionTableFilters";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { getSubmissionStatusLabel } from "@/lib/submissions/submissionStatus";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";

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
  student_name: string;
  mssv: string;
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

export default async function ClassOfficerSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireClassOfficerContext();
  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const officerClass = db.prepare(`
    SELECT class_id FROM class_members
    WHERE user_id=? AND left_at IS NULL
    ORDER BY rowid DESC LIMIT 1
  `).get(user.id) as { class_id: number } | undefined;
  if (!officerClass) throw new Error("Tài khoản cán bộ lớp chưa được gán lớp đang hoạt động.");

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
      INNER JOIN users u ON u.id=s.user_id
      WHERE s.class_id = ? AND e.term_id = ?
        AND s.status<>'draft'
      ORDER BY datetime(e.start_at) DESC, e.id DESC
      `
    )
    .all(officerClass.class_id, selectedTerm.id) as EventOption[];

  const where: string[] = ["s.class_id = ?", "e.term_id = ?", "s.status <> 'draft'"];
  const values: unknown[] = [officerClass.class_id, selectedTerm.id];

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
        e.title AS event_title,
        u.full_name AS student_name,
        u.mssv
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
            <h1 className="text-2xl font-semibold">Hồ sơ</h1>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">Danh sách hồ sơ</h2>
          <div className="mt-1 text-sm text-slate-400">{Number(totalRow.total ?? 0)} hồ sơ</div>
        </div>
        <SubmissionTableFilters
          eventOptions={eventOptions}
          statusOptions={statusOptions}
        />

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[24%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Sinh viên
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Cập nhật
                </th>
                <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
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
                    <td className="px-4 py-4"><div className="text-sm font-semibold text-slate-900">{item.student_name}</div><div className="mt-1 text-xs text-slate-500">{item.mssv}</div></td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {getSubmissionStatusLabel(item.status)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatDateTimeVN(item.updated_at)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/dashboard/class-officer/submissions/${item.id}?termId=${selectedTerm.id}`}
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
