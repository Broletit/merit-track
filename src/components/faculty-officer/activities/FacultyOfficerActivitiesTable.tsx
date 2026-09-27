import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import TableActionLink from "@/components/shared/TableActionLink";
import FacultyOfficerActivitiesFilter from "./FacultyOfficerActivitiesFilters";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import type { FacultyOfficerActivityItem } from "./types";

export default function FacultyOfficerActivitiesTable({
  items,
  page,
  totalPages,
  totalResults,
  searchParams,
}: {
  items: FacultyOfficerActivityItem[];
  page: number;
  totalPages: number;
  totalResults: number;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách hoạt động
        </h2>
        <p className="mt-1 text-sm text-slate-400">{totalResults} hoạt động</p>
      </div>

      <div className="mt-5">
        <FacultyOfficerActivitiesFilter />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[820px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[38%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="w-[24%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Đăng ký
              </th>
              <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Đã tham gia
              </th>
              <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top">
                    <div className="mb-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.organizerLevel === "class" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{item.organizerLevel === "class" ? "Cấp lớp" : "Cấp khoa"}</span></div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.startAt)}
                    <div className="mt-1 text-xs text-slate-400">đến {formatDateTimeVN(item.endAt)}</div>
                  </td>

                  <td className="px-4 py-4 text-center align-top text-sm font-semibold text-blue-700">
                    {item.participants}
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <div className="text-sm font-semibold text-emerald-700">{item.attended}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.participants ? Math.round(item.attended/item.participants*100) : 0}% đăng ký</div>
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <TableActionLink href={`/dashboard/faculty-officer/activities/${item.id}${searchParams.termId ? `?termId=${encodeURIComponent(searchParams.termId)}` : ""}`} variant="view">Xem</TableActionLink>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có hoạt động phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <ReviewPagination
          page={page}
          totalPages={totalPages}
          basePath="/dashboard/faculty-officer/activities"
          searchParams={searchParams}
        />
      </div>
    </section>
  );
}
