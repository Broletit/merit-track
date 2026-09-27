export default function ReportProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label || "Tỉ lệ"}</span>
        <span className="font-semibold text-slate-700">{percent}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}