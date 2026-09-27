import FacultyOfficerAttendanceLogsFilter from "./FacultyOfficerAttendanceLogsFilter";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { AttendanceLogItem, CheckinLogActivityOption } from "./types";

function mapResultLabel(result: string) {
  if (result === "success") return "Thành công";
  if (result === "duplicate") return "Trùng";
  if (result === "invalid") return "Không hợp lệ";
  if (result === "out_of_window") return "Ngoài thời gian";
  if (result === "not_registered") return "Chưa đăng ký";
  return result;
}

function getResultClass(result: string) {
  if (result === "success") return "bg-emerald-50 text-emerald-700";
  if (result === "duplicate") return "bg-amber-50 text-amber-700";
  if (result === "not_registered") return "bg-orange-50 text-orange-700";
  return "bg-rose-50 text-rose-700";
}

export default function FacultyOfficerAttendanceLogsTable({
  items,
  activities,
}: {
  items: AttendanceLogItem[];
  activities: CheckinLogActivityOption[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Lịch sử điểm danh gần đây
        </h2>
      
      </div>

      <div className="mt-5">
        <FacultyOfficerAttendanceLogsFilter activities={activities} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Người dùng
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Kết quả
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Ghi chú
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {item.activityTitle}
                  </td>

                  <td className="px-4 py-4">
                    <div className="whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.fullName || "Không xác định"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.mssv || "-"}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                    {formatDateTimeVN(item.scannedAt)}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getResultClass(
                        item.result
                      )}`}
                    >
                      {mapResultLabel(item.result)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {item.note || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có lịch sử điểm danh phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}