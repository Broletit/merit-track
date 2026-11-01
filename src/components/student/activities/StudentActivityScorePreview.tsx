import type { StudentActivityItem } from "./types";

export default function StudentActivityScorePreview({
  item,
  inGrid = false,
  inTable = false,
}: {
  item: StudentActivityItem;
  inGrid?: boolean;
  inTable?: boolean;
}) {
  if (!item.categoryLabel) return null;

  const completed = ["attended", "absent"].includes(item.registrationStatus ?? "");
  const capped = item.projectedScore === 0 && !completed;
  const parentCode = item.categoryParentLabel?.split("·")[0].trim().replace(/\.$/, "");
  const label = parentCode ? `${parentCode}.${item.categoryLabel}` : item.categoryLabel;
  const scoreState = item.registrationStatus === "attended"
    ? `Đã cộng +${item.conductScore} điểm`
    : item.registrationStatus === "absent"
      ? `Đã trừ −${item.conductScore} điểm`
      : capped
        ? "Đã đạt điểm tối đa"
        : `Điểm thực tăng dự kiến +${item.projectedScore ?? 0}`;
  const scoreStateClass = item.registrationStatus === "absent"
    ? "text-rose-700"
    : capped
      ? "text-amber-700"
      : "text-emerald-700";

  return (
    <div className={`${inTable ? "" : inGrid ? "h-full min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200" : "mt-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"} text-sm text-black`}>
      {inGrid ? <div className="mb-2 text-sm text-slate-500">Khung điểm rèn luyện</div> : null}
      <div className="min-w-0 truncate">
        {label}: <span className="font-semibold text-emerald-700">{item.categoryScore}/{item.categoryMax} điểm</span>
      </div>
      <div className={`mt-1 min-w-0 truncate text-xs font-bold ${scoreStateClass}`}>{scoreState}</div>
    </div>
  );
}
