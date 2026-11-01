import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import type { ClassOfficerStats } from "./types";

export default function ClassOfficerStatsCards({
  stats,
}: {
  stats: ClassOfficerStats;
}) {
  return (
    <>
      <section className={[statCardStyles.card, "min-w-0"].join(" ")}>
        <div className={statCardStyles.label}>Lớp phụ trách</div>
        <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>
          {stats.classCode ? `${stats.classCode} - ${stats.className}` : stats.className}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className={statCardStyles.card}>
          <div className={statCardStyles.label}>Sinh viên lớp</div>
          <div className={statCardStyles.value}>{stats.myClassStudents}</div>
        </div>

        <div className={statCardStyles.card}>
          <div className={statCardStyles.label}>Hoạt động</div>
          <div className={statCardStyles.value}>{stats.totalActivities}</div>
        </div>

        <div className={statCardStyles.card}>
          <div className={statCardStyles.label}>Đợt xét áp dụng</div>
          <div className={statCardStyles.value}>{stats.totalEvents}</div>
        </div>

        <div className={statCardStyles.card}>
          <div className={statCardStyles.label}>Chờ duyệt vòng 1</div>
          <div className={statCardStyles.value}>{stats.pendingRound1}</div>
        </div>
      </section>
    </>
  );
}