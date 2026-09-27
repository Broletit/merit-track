import Link from "next/link";
import type { ClassOfficerRecentSubmissionItem } from "./types";

function formatStatusLabel(status: string) {
  if (status === "submitted_v1") return "Chờ duyệt vòng 1";
  if (status === "needs_revision_v1") return "Cần bổ sung";
  if (status === "submitted_v2") return "Đã qua vòng 1";
  if (status === "passed") return "Đạt";
  if (status === "failed") return "Không đạt";
  if (status === "closed") return "Đã đóng";
  return "Bản nháp";
}

export default function ClassOfficerRecentSubmissions({
  items,
}: {
  items: ClassOfficerRecentSubmissionItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Hồ sơ gần đây của lớp
        </h2>
        <Link
          href="/dashboard/class-officer/submissions"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
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
        </table>
      </div>
    </section>
  );
}
