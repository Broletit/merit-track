import { getEventSubmissionPhaseFilter } from "@/server/events/eventSubmissionPhaseFilter";
import NumberedTable from "@/components/common/NumberedTable";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import SubmissionTableFilters from "@/components/shared/submissions/SubmissionTableFilters";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  page?: string;
  termId?: string;
  status?: string;
  eventName?: string;
  phase?: string;
  sort?: string;
}>;

type Row = {
  id: number;
  status: string;
  updated_at: string;
  event_title: string;
};

const PAGE_SIZE = 10;

const statusOptions = [
  { value: "draft", label: "Chưa hoàn tất" },
  { value: "submitted_v1", label: "Chờ duyệt vòng 1" },
  { value: "submitted_v2", label: "Chờ duyệt vòng 2" },
  { value: "needs_revision_v1", label: "Cần chỉnh sửa" },
  { value: "passed", label: "Đã đạt" },
  { value: "failed", label: "Không đạt" },
];

export default async function StudentSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;
  const db = getDatabase();

  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const eventName=String(params.eventName??"").trim();
  const status = String(params.status ?? "").trim();
  const phase=["not_open","accepting","expired","closed"].includes(params.phase??"")?params.phase!:"";
  const sort=params.sort==="oldest"?"oldest":"latest";

  const where: string[] = [
    "s.user_id = ?",
    "e.term_id = ?",
    "e.type = 'student'",

  ];
  const values: unknown[] = [user.id, selectedTerm.id];
  if (status === "needs_revision_v1") {
    where.push("s.status IN ('needs_revision_v1','needs_revision_v2','rejected_v1','rejected_v2')");
  } else if (status === "passed") {
    where.push("s.status IN ('passed','approved')");
  } else if (status === "failed") {
    where.push("s.status IN ('failed','rejected')");
  } else if (["draft","submitted_v1","submitted_v2"].includes(status)) {
    where.push("s.status = ?");values.push(status);
  }

  if(eventName){where.push("e.title LIKE ?");values.push(`%${eventName}%`);}

  const phaseFilter=getEventSubmissionPhaseFilter(phase);
  if(phaseFilter)where.push(`(${phaseFilter})`);

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        s.id,
        s.status,
        s.updated_at,
        e.title AS event_title
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      ${whereSql}
      ORDER BY CAST(s.updated_at AS DATETIME(3)) ${sort==="oldest"?"ASC":"DESC"}, s.id ${sort==="oldest"?"ASC":"DESC"}
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

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-xl font-semibold text-slate-900">Danh sách hồ sơ</h2>
        <SubmissionTableFilters
          statusOptions={statusOptions}
        />

        <div data-table-frame className="min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="mt-5 overflow-hidden rounded-none border border-slate-200">
          <NumberedTable page={page} className="min-w-full table-fixed divide-y divide-slate-200">
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
                      <SubmissionStatusBadge status={item.status}/>
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
          </NumberedTable>
        </div>
<div className="mt-5">
          <Pagination totalResults={Number(totalRow.total ?? 0)} resultLabel="hồ sơ"
            page={page}
            totalPages={totalPages}
            searchParams={{
              termId: String(selectedTerm.id),
              status, phase, sort, eventName,
            }}
          />
        </div>
</div>
      </section>
    </main>
  );
}
