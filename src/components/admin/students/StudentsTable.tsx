import StudentsFilter from "./StudentsFilters";
import type { AdminStudentClassOption, AdminStudentItem } from "./types";

export default function StudentsTable({
  items,
  classes,
}: {
  items: AdminStudentItem[];
  classes: AdminStudentClassOption[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách sinh viên
        </h2>
      </div>

      <div className="mt-5">
        <StudentsFilter classes={classes} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[32%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Sinh viên
              </th>
              <th className="w-[18%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                MSSV
              </th>
              <th className="w-[28%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Lớp
              </th>
              <th className="w-[22%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.fullName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.email || "Chưa có email"}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm font-medium text-slate-700">
                    {item.mssv}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.classCode ? (
                      <>
                        <div className="font-medium">{item.classCode}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.className}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">Chưa có lớp</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                        item.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.isActive ? "Đang hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có sinh viên phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}