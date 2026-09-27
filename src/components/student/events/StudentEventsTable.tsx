import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { StudentEventItem } from "./types";
import StudentEventsFilter from "./StudentEventsFilter";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";

function mapStatus(status: string | null) {
  if (!status) return "Chưa nộp";
  if (status === "submitted_v1") return "Chờ duyệt vòng 1";
  if (status === "submitted_v2") return "Chờ duyệt vòng 2";
  if (status === "approved") return "Đã duyệt";
  if (status.startsWith("rejected")) return "Bị từ chối";
  return status;
}

export default function StudentEventsTable({
  items,
}: {
  items: StudentEventItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Danh sách đợt xét
      </h2>
      
    <div className="mt-5">
      <StudentEventsFilter />
    </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[26%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đợt xét
              </th>
              <th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái hồ sơ
              </th>
              <th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Nhận hồ sơ
              </th>
              <th className="w-[23%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[17%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapStatus(item.submissionStatus)}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <EventSubmissionPhaseBadge
                      event={{
                        status: item.status,
                        startAt: item.startAt,
                        endAt: item.endAt,
                        allowLate: item.allowLate,
                      }}
                    />
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.startAt)} → {formatDateTimeVN(item.endAt)}
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <Link
                      href={`/dashboard/student/events/${item.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Hiện chưa có đợt xét nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
