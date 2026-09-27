import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import FacultyOfficerActivityRegistrationsFilter from "./FacultyOfficerActivityRegistrationsFilter";
import type {
  FacultyOfficerActivityClassOption,
  FacultyOfficerActivityRegistrationItem,
} from "./types";

function mapStatusLabel(value: string) {
  if (value === "attended") return "Đã điểm danh";
  return "Đã đăng ký";
}

function getStatusClass(value: string) {
  if (value === "attended") return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

export default function FacultyOfficerActivityRegistrationsTable({
  items,
  classes,
}: {
  items: FacultyOfficerActivityRegistrationItem[];
  classes: FacultyOfficerActivityClassOption[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Sinh viên các lớp tham gia
        </h2>
      </div>

      <div className="mt-5">
        <FacultyOfficerActivityRegistrationsFilter classes={classes} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[34%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Người tham gia
              </th>
              <th className="w-[20%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Lớp
              </th>
              <th className="w-[16%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="w-[15%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đăng ký
              </th>
              <th className="w-[15%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Điểm danh
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
                      MSSV: {item.mssv}
                    </div>
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
                      "-"
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        item.status
                      )}`}
                    >
                      {mapStatusLabel(item.status)}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.registeredAt)}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.checkedInAt ? formatDateTimeVN(item.checkedInAt) : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có người đăng ký phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
