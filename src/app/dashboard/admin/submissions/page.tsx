import { cohortClause } from "@/server/cohorts/sql";
import NumberedTable from "@/components/common/NumberedTable";
import { addCohortFilter } from "@/server/cohorts/sql";
import TableActionLink from "@/components/shared/TableActionLink";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import ReviewFilters from "@/components/shared/reviews/ReviewFilters";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
  page?: string;
  keyword?: string;
  termId?: string;
  eventId?: string;
  status?: string;
  sort?: string;
  round?: string;
  class?: string;
}>;

type Row = {
  id: number;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string | null;
  status: string;
  updated_at: string;
  has_support: number;
  review_round: number;
};

const PAGE_SIZE = 10;

export default async function AdminStudentSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDatabase();
  

  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const sort = String(params.sort ?? "latest").trim();
  const round = String(params.round ?? "").trim();
  const classCode = String(params.class ?? "").trim();

  const classOptions = ((await db.rows(`SELECT code FROM classes WHERE is_active=1 AND ${cohortClause(params.cohort, "cohort")} ORDER BY code`, [])) as Array<{code:string}>).map((item) => item.code);

  const where: string[] = [
    "e.term_id = ?",
    "e.type = 'student'",
    "(s.submitted_at IS NOT NULL OR EXISTS (SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open'))",
  ];
  const values: unknown[] = [selectedTerm.id];
  addCohortFilter(where,values,params.cohort,"u.cohort");

  if (keyword) {
    where.push("((LOCATE(LOWER(?), LOWER(u.full_name)) > 0) OR (LOCATE(LOWER(?), LOWER(u.mssv)) > 0) OR (LOCATE(LOWER(?), LOWER(e.title)) > 0))");
    values.push(keyword, keyword, keyword);
  }

  if (status === "support") {
    where.push("EXISTS (SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open')");
  } else if (status) {
    where.push("s.status = ?");
    values.push(status);
  }
  if (round === "1" || round === "2") { where.push("s.review_round = ?"); values.push(Number(round)); }
  if (classCode) { where.push("c.code = ?"); values.push(classCode); }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const orderSql =
    sort === "oldest"
      ? "CAST(s.updated_at AS DATETIME(3)) ASC, s.id ASC"
      : "CAST(s.updated_at AS DATETIME(3)) DESC, s.id DESC";

  const totalRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        s.id,
        s.status,
        s.updated_at,
        s.review_round,
        e.title AS event_title,
        u.full_name AS student_name,
        u.mssv,
        c.code AS class_code,
        EXISTS (SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open') AS has_support
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ?
      OFFSET ?
      `, [...values, PAGE_SIZE, offset])) as Row[];

  const totalPages = Math.max(
    1,
    Math.ceil(Number(totalRow.total ?? 0) / PAGE_SIZE)
  );

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Hồ sơ sinh viên</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="flex flex-col rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="order-2 mt-5">
          <ReviewFilters
            showEventFilter={false}
            searchPlaceholder="Tìm họ tên, MSSV hoặc tên đợt xét..."
            classOptions={classOptions}
            showRound
            showSort={false}
          />
        </div>

      <div className="order-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Danh sách hồ sơ
          </h2>
        </div>

        <div data-table-frame className="order-3 mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
          <NumberedTable page={page} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[23%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[19%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Sinh viên
                </th>
                <th data-column-align="left" className="w-[11%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">
                  Lớp
                </th>
                <th className="w-[11%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Vòng xét duyệt
                </th>
                <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
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

                    <td data-column-align="left" className="px-4 py-4 align-top text-sm text-slate-700 text-left">
                      {item.class_code ?? "-"}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Vòng {Number(item.review_round ?? 1)}</span>
                    </td>

                    <td className="px-4 py-4 text-center align-middle">
                      <SubmissionStatusBadge status={item.status} />
                      {Number(item.has_support)===1 ? <div className="mt-1 text-xs text-amber-700">Có yêu cầu hỗ trợ</div> : null}
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
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Không có hồ sơ phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5">
          <Pagination totalResults={Number(totalRow.total ?? 0)} resultLabel="hồ sơ"
            page={page}
            totalPages={totalPages}
            searchParams={{ cohort: params.cohort,
              keyword,
              termId: String(selectedTerm.id),
              status,
              sort,
              round,
              class: classCode,
            }}
          />
        </div>
</div>
      </section>
    </main>
  );
}
