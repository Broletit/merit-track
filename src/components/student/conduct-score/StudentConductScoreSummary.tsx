import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import type { StudentConductScoreSummaryData } from "./types";

export default function StudentConductScoreSummary({
  summary,
}: {
  summary: StudentConductScoreSummaryData;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Điểm rèn luyện hiện có" value={summary.totalScore} />
      <Card label="Điểm đã cộng" value={summary.addedScore} tone="green" prefix="+" />
      <Card label="Điểm đã trừ" value={summary.deductedScore} tone="red" prefix="−" />
      <Card label="Hoạt động đã tham gia" value={summary.activityCount} />
    </section>
  );
}

function Card({ label, value, tone = "default", prefix = "" }: { label: string; value: number; tone?: "default" | "green" | "red"; prefix?: string }) {
  const valueTone = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-rose-700" : "text-slate-900";
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className={statCardStyles.label}>{label}</div>
      <div className={[statCardStyles.value, `mt-2 text-3xl font-semibold ${valueTone}`].join(" ")}>{prefix}{value}</div>
    </div>
  );
}
