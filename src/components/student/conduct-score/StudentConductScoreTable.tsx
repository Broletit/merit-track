import PaginatedTable from "@/components/common/PaginatedTable";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { StudentConductScoreItem } from "./types";
import StudentConductScoreFilter from "./StudentConductScoreFilter";

export default function StudentConductScoreTable({
  items,
}: {
  items: StudentConductScoreItem[];
}) {
  return (
    <section>
      <div>
                 <StudentConductScoreFilter />
        </div>

      <div className="mt-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Lịch sử hoạt động và điểm
        </h2>
      </div>

      <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<PaginatedTable className="min-w-full table-fixed divide-y divide-slate-200" containerClassName="overflow-hidden rounded-none border border-slate-200" resultLabel="bản ghi">
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
                Mức điểm
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
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.registrationStatus === "attended" ? "bg-emerald-50 text-emerald-700" : item.registrationStatus === "absent" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                      {item.registrationStatus === "attended" ? "Đã tham gia" : item.registrationStatus === "absent" ? "Vắng" : "Đã đăng ký"}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.checkedInAt ? formatDateTimeVN(item.checkedInAt) : "-"}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.registrationStatus === "attended" ? <span className="font-semibold text-emerald-700">+{item.conductScore}</span> : item.registrationStatus === "absent" ? <span className="font-semibold text-rose-700">−{item.conductScore}</span> : <span className="text-slate-400">Chưa xác nhận</span>}
                  </td>

                  <td className="px-4 py-4 align-top">
                    {item.scoreValue !== null && item.scoreValue < 0 ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Đã trừ {Math.abs(item.scoreValue)} điểm</span>
                    ) : item.scoreAdded ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Đã cộng {item.scoreValue ?? item.conductScore} điểm</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Chưa xác nhận
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
        </PaginatedTable>

</div>
    </section>
  );
}
