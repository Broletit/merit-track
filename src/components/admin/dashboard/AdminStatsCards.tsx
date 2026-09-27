import { AdminStats } from "./types";

export default function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const items = [
    {
      label: "Sinh viên",
      value: stats.totalStudents,
      className: "bg-gradient-to-br from-blue-900 to-blue-700 text-white",
      subClassName: "text-blue-100/80",
    },
    {
      label: "Hoạt động",
      value: stats.totalActivities,
      className: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white",
      subClassName: "text-sky-100/80",
    },
    {
      label: "Lượt tham gia",
      value: stats.totalParticipations,
      className: "bg-gradient-to-br from-emerald-500 to-green-500 text-white",
      subClassName: "text-emerald-100/80",
    },
    {
      label: "Đợt xét",
      value: stats.totalCampaigns,
      className: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
      subClassName: "text-violet-100/80",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl p-5 shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] ${item.className}`}
        >
          <div className={`text-sm ${item.subClassName}`}>{item.label}</div>
          <div className="mt-2 text-3xl font-semibold">{item.value}</div>
        </div>
      ))}
    </section>
  );
}