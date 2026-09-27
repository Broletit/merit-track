import type { FacultyOfficerStats } from "./types";

export default function FacultyOfficerStatsCards({
  stats,
}: {
  stats: FacultyOfficerStats;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl bg-linear-to-r from-indigo-700 to-blue-500 p-6 text-white shadow-sm">
        <div className="text-sm text-white/80">Lớp phụ trách</div>
        <div className="mt-4 text-4xl font-bold">{stats.totalClasses}</div>
      </div>

      <div className="rounded-2xl bg-linear-to-r from-blue-700 to-blue-500 p-6 text-white shadow-sm">
        <div className="text-sm text-white/80">Hoạt động</div>
        <div className="mt-4 text-4xl font-bold">{stats.totalActivities}</div>
      </div>

      <div className="rounded-2xl bg-linear-to-r from-cyan-500 to-sky-500 p-6 text-white shadow-sm">
        <div className="text-sm text-white/80">Đợt xét áp dụng</div>
        <div className="mt-4 text-4xl font-bold">{stats.totalEvents}</div>
      </div>

      <div className="rounded-2xl bg-linear-to-r from-emerald-500 to-green-500 p-6 text-white shadow-sm">
        <div className="text-sm text-white/80">Điểm danh hôm nay</div>
        <div className="mt-4 text-4xl font-bold">{stats.todayCheckins}</div>
      </div>

      <div className="rounded-2xl bg-linear-to-r from-fuchsia-500 to-purple-500 p-6 text-white shadow-sm">
        <div className="text-sm text-white/80">Chờ duyệt vòng 2</div>
        <div className="mt-4 text-4xl font-bold">{stats.pendingRound2}</div>
      </div>
    </section>
  );
}