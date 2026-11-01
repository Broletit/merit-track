import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
export default function OverviewStatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className={statCardStyles.label}>{label}</div>
        <div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>
          {icon}
        </div>
      </div>

      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>

      {hint ? <div className={[statCardStyles.label, "mt-1"].join(" ")}>{hint}</div> : null}
    </div>
  );
}