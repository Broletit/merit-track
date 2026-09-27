import Link from "next/link";
import type { FacultyOfficerActivityItem } from "./types";

function formatActivityTime(startAt: string, endAt: string) {
  if (!startAt && !endAt) return "Chưa cập nhật thời gian";
  if (startAt && endAt) return `${startAt} → ${endAt}`;
  return startAt || endAt || "Chưa cập nhật thời gian";
}

export default function FacultyOfficerRecentActivities({
  items,
}: {
  items: FacultyOfficerActivityItem[];
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Hoạt động gần đây
        </h2>
        <Link
          href="/dashboard/faculty-officer/activities"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="text-lg font-semibold text-slate-900">
                {item.title}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {formatActivityTime(item.startAt, item.endAt)}
              </div>
              <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                {item.participants} lượt đăng ký
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
            Chưa có hoạt động nào gần đây.
          </div>
        )}
      </div>
    </section>
  );
}
