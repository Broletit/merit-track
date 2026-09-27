import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import AdminOfficerReviewsFilter from "./AdminOfficerReviewsFilter";

type EventOption = {
  id: number;
  title: string;
};

export type AdminOfficerReviewRow = {
  id: number;
  eventTitle: string;
  officerName: string;
  officerCode: string;
  classCode: string;
  scoreTotal: number;
  status: string;
  updatedAt: string | null;
  submittedAt: string | null;
  eventEndAt: string;
  reviewerName: string | null;
  lastReviewNote: string | null;
  revisionCount: number;
  totalCriteria: number;
  completedCriteria: number;
};

function getQueueLabel(item: AdminOfficerReviewRow) {
  const now = new Date();
  const end = new Date(item.eventEndAt);

  if (item.status === "needs_revision_v1") {
    return {
      label: "Chờ cập nhật",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  if (item.status === "submitted_v1" && end < now) {
    return {
      label: "Quá hạn duyệt",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  return {
    label: "Cần duyệt",
    className: "bg-blue-50 text-blue-700 ring-blue-100",
  };
}

function getProgress(item: AdminOfficerReviewRow) {
  if (item.totalCriteria <= 0) return "Chưa có tiêu chí";
  return `${item.completedCriteria}/${item.totalCriteria} tiêu chí`;
}

function getProgressPercent(item: AdminOfficerReviewRow) {
  if (item.totalCriteria <= 0) return "Chưa có tiêu chí";

  return `${Math.round(
    (item.completedCriteria / item.totalCriteria) * 100
  )}% hoàn thiện`;
}

export default function AdminOfficerReviewsTable({
  items,
  eventOptions,
}: {
  items: AdminOfficerReviewRow[];
  eventOptions: EventOption[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Hàng đợi duyệt hồ sơ cán bộ
      </h2>

      <div className="mt-5">
        <AdminOfficerReviewsFilter
          eventOptions={eventOptions}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đợt xét
              </th>
              <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Cán bộ
              </th>
              <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tiến độ
              </th>
              <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Xử lý
              </th>
              <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="w-[10%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Cập nhật
              </th>
              <th className="w-[8%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => {
                const queue = getQueueLabel(item);

                return (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 align-top">
                      <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {item.eventTitle}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Hạn: {formatDateTimeVN(item.eventEndAt)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-sm font-medium text-slate-800">
                        {item.officerName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.officerCode} · {item.classCode}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-sm font-semibold text-slate-800">
                        {getProgress(item)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {getProgressPercent(item)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${queue.className}`}
                      >
                        {queue.label}
                      </span>

                      {item.lastReviewNote ? (
                        <div className="mt-2 line-clamp-2 text-xs text-slate-500">
                          {item.lastReviewNote}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <SubmissionStatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="text-sm text-slate-700">
                        {item.updatedAt ? formatDateTimeVN(item.updatedAt) : "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.reviewerName || "Chưa duyệt"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center align-top">
                      <Link
                        href={`/dashboard/admin/officer-reviews/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có hồ sơ cán bộ cần xử lý.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
