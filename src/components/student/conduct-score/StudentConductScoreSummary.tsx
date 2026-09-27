import type { StudentConductScoreSummaryData } from "./types";

export default function StudentConductScoreSummary({
  summary,
}: {
  summary: StudentConductScoreSummaryData;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card label="Tổng điểm đã cộng" value={summary.totalScore} />
      <Card label="Hoạt động đã tham gia" value={summary.activityCount} />
      <Card label="Chờ cộng điểm" value={summary.pendingActivityCount} />
    </section>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}