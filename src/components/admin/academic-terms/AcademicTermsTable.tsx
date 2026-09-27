import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import AcademicTermActiveButton from "./AcademicTermActiveButton";
import type { AcademicTermItem } from "./types";

export default function AcademicTermsTable({
  items,
}: {
  items: AcademicTermItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Danh sách học kỳ
      </h2>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[28%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Học kỳ
              </th>
              <th className="w-[16%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Năm học
              </th>
              <th className="w-[14%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Kỳ
              </th>
              <th className="w-[26%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[16%] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Áp dụng
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.academicYear}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.semester}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.startAt)} →{" "}
                    {formatDateTimeVN(item.endAt)}
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
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Chưa có học kỳ nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}