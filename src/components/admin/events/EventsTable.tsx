import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { AdminEventItem } from "./types";
import EventsFilter from "./EventsFilter";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import DeleteEntityButton from "@/components/admin/shared/DeleteEntityButton";
import { deleteEvent } from "@/server/actions/events/deleteEvent";
import TableActionLink from "@/components/shared/TableActionLink";

function mapType(type: string) {
  if (type === "student") return "Sinh viên";
  if (type === "officer") return "Cán bộ đoàn";
  return type;
}

function mapStatus(status: string) {
  if (status === "draft") return "Nháp";
  if (status === "published") return "Công khai";
  if (status === "closed") return "Đã đóng";
  return status;
}

function statusClass(status: string) {
  if (status === "published") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "closed") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-100";
}

export default function EventsTable({
  items,
  canManage,
}: {
  items: AdminEventItem[];
  canManage: boolean;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách sự kiện
        </h2>
      </div>

      <div className="mt-5">
        <EventsFilter />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[1050px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đợt xét
              </th>
              <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Nhận hồ sơ
              </th>
              <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Thời gian
              </th>
              <th className="w-[7%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Hồ sơ
              </th>
              <th className="w-[13%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top">
                    <div className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>

                    <div className="mt-1 line-clamp-1 text-xs text-blue-700">
                      {item.templateName || "Chưa chọn mẫu tiêu chuẩn"}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapType(item.type)}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                        item.status
                      )}`}
                    >
                      {mapStatus(item.status)}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <EventSubmissionPhaseBadge
                      event={{
                        status: item.status,
                        startAt: item.startAt,
                        endAt: item.endAt,
                        allowLate: item.allowLate,
                      }}
                    />
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div>{formatDateTimeVN(item.startAt)}</div>
                    <div className="mt-1 text-xs text-slate-400">đến</div>
                    <div>{formatDateTimeVN(item.endAt)}</div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.submissions}
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <div className="flex justify-center gap-2">
                      <TableActionLink href={`/dashboard/admin/events/${item.id}`} variant="view">Xem</TableActionLink>

                      {canManage ? <TableActionLink href={`/dashboard/admin/events/${item.id}/edit`} variant="edit">Sửa</TableActionLink> : null}
                      {canManage ? <DeleteEntityButton label="Xóa" confirmMessage={`Xóa đợt xét “${item.title}”?`} action={deleteEvent.bind(null, item.id)} disabled={item.submissions > 0} /> : null}
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
                  Chưa có đợt xét nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
