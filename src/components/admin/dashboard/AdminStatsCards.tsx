import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { AdminStats } from "./types";
import { Activity, CalendarCheck, UserCheck, Users } from "lucide-react";

export default function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const items = [
    {
      label: "Sinh viên",
      value: stats.totalStudents,
      icon: Users,
    },
    {
      label: "Hoạt động",
      value: stats.totalActivities,
      icon: Activity,
    },
    {
      label: "Lượt tham gia",
      value: stats.totalParticipations,
      icon: UserCheck,
    },
    {
      label: "Đợt xét",
      value: stats.totalCampaigns,
      icon: CalendarCheck,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {items.map((item) => { const Icon = item.icon; return (
        <div key={item.label} className={[statCardStyles.card, "min-w-0"].join(" ")}>
          <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>{item.label}</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}><Icon size={20} /></div></div>
          <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{item.value}</div>
        </div>
      ); })}
    </section>
  );
}
