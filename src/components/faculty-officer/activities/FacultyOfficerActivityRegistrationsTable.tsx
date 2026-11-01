import NumberedTable from "@/components/common/NumberedTable";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import FacultyOfficerActivityRegistrationsFilter from "./FacultyOfficerActivityRegistrationsFilter";
import type {
  FacultyOfficerActivityClassOption,
  FacultyOfficerActivityRegistrationItem,
} from "./types";

function mapStatusLabel(value: string) {
  if (value === "attended") return "Đã điểm danh";
  if (value === "absent") return "Không tham gia";
  return "Đã đăng ký";
}

function getStatusClass(value: string) {
  if (value === "attended") return "bg-emerald-50 text-emerald-700";
  if (value === "absent") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
}

export default function FacultyOfficerActivityRegistrationsTable({ page = 1,
  items,
  classes,
}: { page?: number;
  items: FacultyOfficerActivityRegistrationItem[];
  classes: FacultyOfficerActivityClassOption[];
}) {
  return (
    <section className="flex flex-col rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="order-2 mt-5">
        <FacultyOfficerActivityRegistrationsFilter classes={classes} />
      </div>

      <div className="order-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Sinh viên toàn khoa đăng ký
        </h2>
      </div>

      <div className="order-3 mt-5 overflow-hidden rounded-none border border-slate-200">
        <NumberedTable page={page} className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th data-column-align="left" className="w-[34%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Người tham gia
              </th>
              <th data-column-align="left" className="w-[20%] whitespace-nowrap px-4 py-3  text-sm font-semibold text-slate-700 text-left">
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
                  <td data-column-align="left" className="px-4 py-4 align-top text-left">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.fullName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      MSSV: {item.mssv}
                    </div>
                  </td>

                  <td data-column-align="left" className="px-4 py-4 align-top text-sm text-slate-700 text-left">
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
        </NumberedTable>
      </div>
    </section>
  );
}
