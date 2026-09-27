import Link from "next/link";
import type { AdminSubmissionListItem } from "./types";

function mapStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Nháp";
    case "submitted_v1":
      return "Chờ duyệt vòng 1";
    case "needs_revision_v1":
      return "Cần bổ sung";
    case "submitted_v2":
      return "Chờ duyệt vòng 2";
    case "passed":
      return "Đạt";
    case "failed":
      return "Không đạt";
    case "closed":
      return "Đã đóng";
    default:
      return status;
  }
}

function getStatusClassName(status: string) {
  switch (status) {
    case "submitted_v1":
    case "submitted_v2":
      return "bg-blue-50 text-blue-700";
    case "needs_revision_v1":
      return "bg-amber-50 text-amber-700";
    case "passed":
      return "bg-emerald-50 text-emerald-700";
    case "failed":
      return "bg-rose-50 text-rose-700";
    case "closed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function SubmissionsList({
  items,
}: {
  items: AdminSubmissionListItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Sinh viên
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
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
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {item.classCode} - {item.className}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {item.eventTitle}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        item.status
                      )}`}
                    >
                      {mapStatusLabel(item.status)}
                    </span>
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
        </table>
      </div>
    </section>
  );
}
