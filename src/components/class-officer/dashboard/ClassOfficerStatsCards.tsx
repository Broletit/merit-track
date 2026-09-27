import type { ClassOfficerStats } from "./types";

export default function ClassOfficerStatsCards({
  stats,
}: {
  stats: ClassOfficerStats;
}) {
  return (
    <>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="text-sm font-medium text-slate-500">Lớp phụ trách</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">
          {stats.classCode ? `${stats.classCode} - ${stats.className}` : stats.className}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-linear-to-r from-blue-700 to-blue-500 p-6 text-white shadow-sm">
          <div className="text-sm text-white/80">Sinh viên lớp</div>
          <div className="mt-4 text-4xl font-bold">{stats.myClassStudents}</div>
        </div>

        <div className="rounded-2xl bg-linear-to-r from-cyan-500 to-sky-500 p-6 text-white shadow-sm">
          <div className="text-sm text-white/80">Hoạt động</div>
          <div className="mt-4 text-4xl font-bold">{stats.totalActivities}</div>
        </div>

        <div className="rounded-2xl bg-linear-to-r from-emerald-500 to-green-500 p-6 text-white shadow-sm">
          <div className="text-sm text-white/80">Đợt xét áp dụng</div>
          <div className="mt-4 text-4xl font-bold">{stats.totalEvents}</div>
        </div>

        <div className="rounded-2xl bg-linear-to-r from-fuchsia-500 to-purple-500 p-6 text-white shadow-sm">
          <div className="text-sm text-white/80">Chờ duyệt vòng 1</div>
          <div className="mt-4 text-4xl font-bold">{stats.pendingRound1}</div>
        </div>
      </section>
    </>
  );
}