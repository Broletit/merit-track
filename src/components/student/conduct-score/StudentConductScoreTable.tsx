import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { StudentConductScoreItem } from "./types";
import StudentConductScoreFilter from "./StudentConductScoreFilter";

export default function StudentConductScoreTable({
  items,
}: {
  items: StudentConductScoreItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Lịch sử hoạt động và điểm
        </h2>
      </div>
      
        <div className="mt-5">
                 <StudentConductScoreFilter />
        </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[38%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="w-[18%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tham gia
              </th>
              <th className="w-[16%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Điểm danh
              </th>
              <th className="w-[14%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Điểm hoạt động
              </th>
              <th className="w-[14%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái điểm
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
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTimeVN(item.startAt)} →{" "}
                      {formatDateTimeVN(item.endAt)}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.registrationStatus === "attended"
                        ? "Đã tham gia"
                        : "Đã đăng ký"}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.checkedInAt ? formatDateTimeVN(item.checkedInAt) : "-"}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.conductScore}
                  </td>

                  <td className="px-4 py-4 align-top">
                    {item.scoreAdded ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Đã cộng {item.scoreValue ?? item.conductScore} điểm
                      </span>
                    ) : item.registrationStatus === "attended" ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Chờ cộng điểm
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Chưa tham gia
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Chưa có dữ liệu hoạt động rèn luyện.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}