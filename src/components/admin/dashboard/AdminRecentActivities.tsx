import { CalendarDays, Users } from "lucide-react";
import { ActivityItem } from "./types";

export default function AdminRecentActivities({
  items,
}: {
  items: ActivityItem[];
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="text-xl font-semibold text-slate-900">Hoạt động gần đây</div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{item.title}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-blue-900" />
                      <span>
                        {item.start_at} → {item.end_at}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-emerald-600" />
                      <span>{item.participants} lượt tham gia</span>
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center rounded-full bg-blue-900 px-3 py-1 text-xs font-medium text-white">
                  #{item.id}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            Chưa có dữ liệu hoạt động.
          </div>
        )}
      </div>
    </section>
  );
}