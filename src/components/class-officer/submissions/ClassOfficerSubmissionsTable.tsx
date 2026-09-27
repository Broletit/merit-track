import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewFilters from "@/components/shared/reviews/ReviewFilters";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";

export type ClassSubmissionRow = {
  id: number;
  eventTitle: string;
  studentName: string;
  studentCode: string;
  classCode: string;
  status: string;
  updatedAt: string | null;
};

export default function ClassOfficerSubmissionsTable({
  items,
  page,
  totalPages,
  searchParams,
}: {
  items: ClassSubmissionRow[];
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Danh sách hồ sơ</h2>
        
      </div>

      <div className="mt-5">
        <ReviewFilters />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đợt xét
              </th>
              <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Sinh viên
              </th>
              <th className="w-[10%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Lớp
              </th>
              <th className="w-[15%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="w-[15%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Cập nhật
              </th>
              <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                    {item.eventTitle}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-medium text-slate-800">
                      {item.studentName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.studentCode}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.classCode}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <SubmissionStatusBadge status={item.status} />
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.updatedAt ? formatDateTimeVN(item.updatedAt) : "-"}
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <Link
                      href={`/dashboard/class-officer/submissions/${item.id}`}
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
                  Không có hồ sơ phù hợp.
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
          basePath="/dashboard/class-officer/submissions"
          searchParams={searchParams}
        />
      </div>
    </section>
  );
}
