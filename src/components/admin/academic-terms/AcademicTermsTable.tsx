import PaginatedTable from "@/components/common/PaginatedTable";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import AcademicTermActiveButton from "./AcademicTermActiveButton";
import type { AcademicTermItem } from "./types";

export default function AcademicTermsTable({
  items,
}: {
  items: AcademicTermItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-900">
        Danh sách học kỳ
      </h2>

      <PaginatedTable className="academic-terms-table min-w-full divide-y divide-slate-200" containerClassName="mt-5 overflow-hidden rounded-none border border-slate-200" resultLabel="bản ghi">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[24%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Năm học
              </th>
              <th className="w-[12%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Kỳ
              </th>
              <th className="w-[40%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[24%] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Áp dụng
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.academicYear}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.semester}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div>Từ {formatDateTimeVN(item.startAt)}</div>
                    <div className="mt-1">Đến {formatDateTimeVN(item.endAt)}</div>
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <AcademicTermActiveButton
                      termId={item.id}
                      isActive={item.isActive}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Chưa có học kỳ nào.
                </td>
              </tr>
            )}
          </tbody>
        </PaginatedTable>
    </section>
  );
}
