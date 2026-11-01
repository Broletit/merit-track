import PaginatedTable from "@/components/common/PaginatedTable";
import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import StudentActivitiesFilter from "./StudentActivitiesFilters";
import StudentActivityRegisterButton from "./StudentActivityRegisterButton";
import StudentActivityScorePreview from "./StudentActivityScorePreview";
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
  if (new Date() > new Date(item.registrationEndAt)) return "Đã hết hạn đăng ký";
  if (new Date() < new Date(item.registrationStartAt)) return "Chưa mở đăng ký";
  if (item.capacityFull) return "Hoạt động đã đạt số lượng đăng ký tối đa";
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
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div>
        <StudentActivitiesFilter />
      </div>

      <div className="mt-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách hoạt động
        </h2>
      </div>

      <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<PaginatedTable className="min-w-[1180px] table-fixed divide-y divide-slate-200" containerClassName="overflow-x-auto rounded-none border border-slate-200" resultLabel="hoạt động">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[22%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="w-[8%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th className="w-[7%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Điểm RL
              </th>
              <th className="w-[18%] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-slate-700">Khung điểm rèn luyện</th>
              <th className="w-[15%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[32%] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-slate-700">
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
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapAudienceLabel(item.audienceType)}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div className="font-semibold text-slate-700">{item.conductScore}</div>
                  </td>

                  <td className="px-4 py-4 text-center text-sm">{item.categoryLabel?<StudentActivityScorePreview item={item} inTable/>:"—"}</td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div>{formatDateTimeVN(item.startAt)}</div>
                    <div className="mt-1 text-xs text-slate-400">đến</div>
                    <div>{formatDateTimeVN(item.endAt)}</div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="grid min-w-[15rem] grid-cols-[auto_minmax(10rem,1fr)] items-stretch gap-2">
                      <Link
                        href={`/dashboard/student/activities/${item.id}`}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>

                      <StudentActivityRegisterButton
                        activityId={item.id}
                        disabled={getRegisterDisabled(item)}
                        label={getRegisterLabel(item)}
                        registrationStatus={item.registrationStatus}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có hoạt động phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </PaginatedTable>

</div>
    </section>
  );
}
