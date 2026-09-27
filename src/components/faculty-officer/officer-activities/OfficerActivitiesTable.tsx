import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import OfficerActivitiesFilter from "./OfficerActivitiesFilter";
import type { OfficerActivityItem } from "./types";

function mapAudience(value: string) {
  if (value === "officer") return "Cán bộ";
  return value === "student" ? "Sinh viên" : "Không xác định";
}

function getRegisterLabel(item: OfficerActivityItem) {
  if (item.registrationStatus === "attended") return "Đã tham gia";
  if (item.registrationStatus === "registered") return "Đã đăng ký";
  if (item.canRegister) return "Có thể đăng ký";
  const now = new Date();
  if (now < new Date(item.registrationStartAt)) return "Chưa mở đăng ký";
  if (now > new Date(item.registrationEndAt)) return "Đã hết hạn đăng ký";
  return "Không thể đăng ký";
}

export default function OfficerActivitiesTable({
  items,
  page,
  totalPages,
  totalResults,
  basePath,
  searchParams,
}: {
  items: OfficerActivityItem[];
  page: number;
  totalPages: number;
  totalResults: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách hoạt động
        </h2>
        <div className="mt-1 text-sm text-slate-400">{totalResults} hoạt động</div>
      </div>

      <div className="mt-5">
        <OfficerActivitiesFilter />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[32%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Điểm RL
              </th>
              <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[20%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Đăng ký: {formatDateTimeVN(item.registrationStartAt)} →{" "}
                      {formatDateTimeVN(item.registrationEndAt)}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapAudience(item.audienceType)}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.conductScore}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.startAt)}
                    <div className="mt-1 text-xs text-slate-500">đến</div>
                    {formatDateTimeVN(item.endAt)}
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href={`${basePath}/${item.id}${searchParams.termId ? `?termId=${encodeURIComponent(searchParams.termId)}` : ""}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>

                      <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                        {getRegisterLabel(item)}
                      </span>
                    </div>
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
          basePath={basePath}
          searchParams={searchParams}
        />
      </div>
    </section>
  );
}
