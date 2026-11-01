import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { CalendarCheck2, CalendarClock, CheckCircle2, ClipboardCheck } from "lucide-react";

export default function OfficerActivityStatsCards({ total, upcoming, registered, attended }: { total: number; upcoming: number; registered: number; attended: number }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card icon={<CalendarCheck2 size={20} />} label="Tất cả hoạt động" value={total} />
      <Card icon={<CalendarClock size={20} />} label="Sắp diễn ra" value={upcoming} />
      <Card icon={<ClipboardCheck size={20} />} label="Đã đăng ký" value={registered} />
      <Card icon={<CheckCircle2 size={20} />} label="Đã tham gia" value={attended} />
    </section>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>;
}
