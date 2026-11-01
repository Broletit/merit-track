import PaginatedTable from "@/components/common/PaginatedTable";
import Link from "next/link";
import type { ClassOfficerRecentSubmissionItem } from "./types";

function formatStatusLabel(status: string) {
  if (status === "submitted_v1") return "Chờ duyệt vòng 1";
  if (status === "needs_revision_v1") return "Cần bổ sung";
  if (status === "submitted_v2") return "Đã qua vòng 1";
  if (status === "passed") return "Đạt";
  if (status === "failed") return "Không đạt";
  if (status === "closed") return "Đã đóng";
  return "Chưa hoàn tất";
}

export default function ClassOfficerRecentSubmissions({
  items,
}: {
  items: ClassOfficerRecentSubmissionItem[];
}) {
  return (
    <section className="min-w-0 rounded-3xl bg-linear-to-br from-white via-blue-50 to-sky-100 p-6 shadow-md ring-1 ring-blue-100 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Hồ sơ gần đây của lớp
        </h2>
        <Link
          href="/dashboard/class-officer/reviews"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Xem tất cả
        </Link>
      </div>

      <PaginatedTable className="min-w-full divide-y divide-slate-200" containerClassName="mt-6 overflow-hidden rounded-none border border-slate-200" resultLabel="bản ghi">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Sinh viên
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 text-sm text-slate-800">
                    {item.studentName}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {item.eventTitle}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-700">
                    {formatStatusLabel(item.status)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {item.submittedAt || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Chưa có hồ sơ nào gần đây.
                </td>
              </tr>
            )}
          </tbody>
        </PaginatedTable>
    </section>
  );
}
