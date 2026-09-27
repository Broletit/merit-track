import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import StudentActivitiesFilter from "./StudentActivitiesFilters";
import StudentActivityRegisterButton from "./StudentActivityRegisterButton";
import type { StudentActivityItem } from "./types";

function mapAudienceLabel(audienceType: string) {
  if (audienceType === "student") return "Sinh viên";
  if (audienceType === "officer") return "Cán bộ";
  return "Không xác định";
}

function getRegisterLabel(item: StudentActivityItem) {
  if (item.participationSource === "external") return "Đăng ký tại hệ thống trường";
  if (item.registrationStatus === "attended") return "Đã đăng ký";
  if (item.registrationStatus === "registered") return "Đã đăng ký";
  return "Đăng ký";
}

function getRegisterDisabled(item: StudentActivityItem) {
  return (
    item.registrationStatus === "registered" ||
    item.registrationStatus === "attended" ||
    !item.canRegister
  );
}

export default function StudentActivitiesTable({
  items,
}: {
  items: StudentActivityItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách hoạt động
        </h2>
      </div>

      <div className="mt-5">
        <StudentActivitiesFilter />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[42%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="w-[12%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th className="w-[10%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Điểm RL
              </th>
              <th className="w-[20%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[16%] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
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
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Đăng ký: {formatDateTimeVN(item.registrationStartAt)} →{" "}
                      {formatDateTimeVN(item.registrationEndAt)}
                    </div>
                    {item.categoryLabel ? <div className={`mt-2 rounded-lg px-2 py-1.5 text-xs ${item.projectedScore===0?"bg-amber-50 text-amber-800":"bg-blue-50 text-blue-700"}`}>{item.categoryLabel}: {item.categoryScore}/{item.categoryMax} · Hoạt động +{item.conductScore} · {item.projectedScore===0?"Mục này đã đạt điểm tối đa":`Điểm thực tăng dự kiến +${item.projectedScore}`}</div> : null}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapAudienceLabel(item.audienceType)}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.conductScore}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div>{formatDateTimeVN(item.startAt)}</div>
                    <div className="mt-1 text-xs text-slate-400">đến</div>
                    <div>{formatDateTimeVN(item.endAt)}</div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href={`/dashboard/student/activities/${item.id}`}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>

                      <StudentActivityRegisterButton
                        activityId={item.id}
                        disabled={getRegisterDisabled(item) && !item.canCancel}
                        label={getRegisterLabel(item)}
                        registrationStatus={item.registrationStatus}
                        canCancel={item.canCancel}
                      />
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
    </section>
  );
}
