import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import type { FacultyOfficerStats } from "./types";

export default function FacultyOfficerStatsCards({
  stats,
}: {
  stats: FacultyOfficerStats;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
      <div className={statCardStyles.card}>
        <div className={statCardStyles.label}>Lớp phụ trách</div>
        <div className={statCardStyles.value}>{stats.totalClasses}</div>
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
        <div className={statCardStyles.label}>Điểm danh hôm nay</div>
        <div className={statCardStyles.value}>{stats.todayCheckins}</div>
      </div>

      <div className={statCardStyles.card}>
        <div className={statCardStyles.label}>Chờ duyệt vòng 2</div>
        <div className={statCardStyles.value}>{stats.pendingRound2}</div>
      </div>
    </section>
  );
}