import TableActionLink from "@/components/shared/TableActionLink";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import SubmissionTableFilters from "@/components/shared/submissions/SubmissionTableFilters";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
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
  sort?: string;
}>;

type Row = {
  id: number;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string | null;
  status: string;
  updated_at: string;
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
  { value: "approved", label: "Đã đạt" },
  { value: "passed", label: "Đã đạt" },
  { value: "failed", label: "Không đạt" },
];

const sortOptions = [
  { value: "latest", label: "Mới cập nhật" },
  { value: "oldest", label: "Cũ nhất" },
];

export default async function AdminStudentSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const sort = String(params.sort ?? "latest").trim();
  const eventId = Number(params.eventId ?? 0);

  const eventOptions = db
    .prepare(
      `
      SELECT id, title
      FROM events
      WHERE term_id = ?
        AND type = 'student'
        AND status = 'published'
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTerm.id) as EventOption[];

  const where: string[] = [
    "e.term_id = ?",
    "e.type = 'student'",
    "s.status <> 'draft'",
    "s.submitted_at IS NOT NULL",
  ];
  const values: unknown[] = [selectedTerm.id];

  if (keyword) {
    where.push("(u.full_name LIKE ? OR u.mssv LIKE ? OR c.code LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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
  const orderSql =
    sort === "oldest"
      ? "datetime(s.updated_at) ASC, s.id ASC"
      : "datetime(s.updated_at) DESC, s.id DESC";

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
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
        u.mssv,
        c.code AS class_code
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY ${orderSql}
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
          <h1 className="text-2xl font-semibold">Hồ sơ sinh viên</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Danh sách hồ sơ
          </h2>
        </div>

        <div className="mt-5">
          <SubmissionTableFilters
            eventOptions={eventOptions}
            statusOptions={statusOptions}
            sortOptions={sortOptions}
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[26%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Sinh viên
                </th>
                <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Lớp
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Cập nhật
                </th>
                <th className="w-[8%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
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
                        {item.student_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.mssv}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {item.class_code ?? "-"}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <SubmissionStatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      {formatDateTimeVN(item.updated_at)}
                    </td>

                    <td className="px-4 py-4 text-center align-top">
                      <TableActionLink
                        href={`/dashboard/admin/submissions/${item.id}`}
                        variant="view"
                      >
                        Xem
                      </TableActionLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
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
              sort,
            }}
          />
        </div>
      </section>
    </main>
  );
}
