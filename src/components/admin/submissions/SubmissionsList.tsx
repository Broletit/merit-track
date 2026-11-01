import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import PaginatedTable from "@/components/common/PaginatedTable";
import Link from "next/link";
import type { AdminSubmissionListItem } from "./types";

export default function SubmissionsList({
  items,
}: {
  items: AdminSubmissionListItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <PaginatedTable className="min-w-full divide-y divide-slate-200" containerClassName="overflow-hidden rounded-none border border-slate-200" resultLabel="bản ghi">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Sinh viên
              </th>
              <th data-column-align="left" className="px-4 py-3  text-sm font-semibold text-slate-700 text-left">
                Lớp
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đợt xét
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Nộp lúc
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 text-sm text-slate-800">
                    {item.studentName}
                  </td>
                  <td data-column-align="left" className="px-4 py-4 text-sm text-slate-600 text-left">
                    {item.classCode} - {item.className}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {item.eventTitle}
                  </td>
                  <td className="px-4 py-4">
                    <SubmissionStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {item.submittedAt || "-"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link
                      href={`/dashboard/admin/submissions/${item.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
                  Không có hồ sơ nào phù hợp bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </PaginatedTable>
    </section>
  );
}
