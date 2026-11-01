import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "./SubmissionStatusBadge";

export default function SubmissionViewOverview({
  status,
  submittedAt,
  updatedAt,
  closesAt,
  currentRound,
  achievedCriteria,
  totalCriteria,
}: {
  status: string;
  submittedAt: string | null;
  updatedAt: string | null;
  closesAt: string | null;
  currentRound: number;
  achievedCriteria: number;
  totalCriteria: number;
}) {
  const progress = totalCriteria > 0
    ? Math.round((achievedCriteria / totalCriteria) * 100)
    : 0;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tổng quan hồ sơ</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Vòng {currentRound}</span>
          <SubmissionStatusBadge status={status} reviewRound={currentRound} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewItem label="Tiêu chí đã đạt" value={`${achievedCriteria}/${totalCriteria}`} />
        <OverviewItem label="Mức hoàn thành" value={`${progress}%`} />
        <OverviewItem
          label="Hạn nhận hồ sơ"
          value={closesAt ? formatDateTimeVN(closesAt) : "Không giới hạn"}
        />
        <OverviewItem
          label="Nộp hồ sơ lúc"
          value={submittedAt ? formatDateTimeVN(submittedAt) : "Chưa ghi nhận"}
        />
      </div>

      {updatedAt ? (
        <div className="mt-4 text-sm text-slate-500">
          Cập nhật gần nhất: <span className="font-medium text-slate-700">{formatDateTimeVN(updatedAt)}</span>
        </div>
      ) : null}
    </section>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}
