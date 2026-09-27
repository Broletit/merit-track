import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ActivitiesFilter from "./AdminActivitiesFilters";
import type { AdminActivityItem } from "./types";
import DeleteEntityButton from "@/components/admin/shared/DeleteEntityButton";
import { deleteActivity } from "@/server/actions/activities/deleteActivity";
import TableActionLink from "@/components/shared/TableActionLink";

function mapStatusLabel(status: string) {
  if (status === "published") return "Công khai";
  return "Nháp";
}

function getStatusClass(status: string) {
  if (status === "published") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function mapAudienceLabel(audienceType: string) {
  if (audienceType === "student") return "Sinh viên";
  if (audienceType === "officer") return "Cán bộ";
  return "Không xác định";
}

export default function ActivitiesTable({
  items,
  canManage,
}: {
  items: AdminActivityItem[];
  canManage: boolean;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách hoạt động
        </h2>
      </div>

      <div className="mt-5">
        <ActivitiesFilter />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[980px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[34%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hoạt động
              </th>
              <th className="w-[10%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th className="w-[10%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="w-[10%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Check-in
              </th>
              <th className="w-[10%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tham gia
              </th>
              <th className="w-[16%] whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[18%] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-slate-700">
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
                    {item.qrCheckinEnabled ? "QR" : "Thủ công"}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.attended}/{item.participants}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div>{formatDateTimeVN(item.startAt)}</div>
                    <div className="mt-1 text-xs text-slate-400">đến</div>
                    <div>{formatDateTimeVN(item.endAt)}</div>
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <div className="flex justify-center gap-2">
                    <TableActionLink href={`/dashboard/admin/activities/${item.id}`} variant="view">Xem</TableActionLink>
                    <TableActionLink
                      href={`/dashboard/admin/activities/${item.id}/edit`}
                      variant="edit"
                      disabled={!canManage}
                      disabledReason="Học kỳ không hiện hành, chỉ được xem dữ liệu"
                    >Sửa</TableActionLink>
                    <DeleteEntityButton
                      label="Xóa"
                      confirmMessage={`Xóa hoạt động “${item.title}”?`}
                      action={deleteActivity.bind(null, item.id)}
                      disabled={!canManage || item.participants > 0}
                      disabledReason={
                        !canManage
                          ? "Học kỳ không hiện hành, chỉ được xem dữ liệu"
                          : "Hoạt động đã có người đăng ký, không thể xóa"
                      }
                    />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
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
