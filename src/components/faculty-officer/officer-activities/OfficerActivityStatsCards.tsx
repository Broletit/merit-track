import { CalendarCheck2, CalendarClock, CheckCircle2, ClipboardCheck } from "lucide-react";

export default function OfficerActivityStatsCards({ total, upcoming, registered, attended }: { total: number; upcoming: number; registered: number; attended: number }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card icon={<CalendarCheck2 size={20} />} label="Tất cả hoạt động" value={total} tone="blue" />
      <Card icon={<CalendarClock size={20} />} label="Sắp diễn ra" value={upcoming} tone="amber" />
      <Card icon={<ClipboardCheck size={20} />} label="Đã đăng ký" value={registered} tone="sky" />
      <Card icon={<CheckCircle2 size={20} />} label="Đã tham gia" value={attended} tone="emerald" />
    </section>
  );
}

function Card({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "blue" | "amber" | "sky" | "emerald" }) {
  const tones = { blue: "bg-blue-50 text-blue-700 ring-blue-100", amber: "bg-amber-50 text-amber-700 ring-amber-100", sky: "bg-sky-50 text-sky-700 ring-sky-100", emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>{icon}</div><div className="mt-4 text-2xl font-semibold text-slate-900">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>;
}
