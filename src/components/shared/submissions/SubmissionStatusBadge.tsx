type Status =
  | "draft"
  | "submitted_v1"
  | "needs_revision_v1"
  | "submitted_v2"
  | "passed"
  | "failed"
  | "closed";

function getConfig(status: Status) {
  switch (status) {
    case "submitted_v1":
      return {
        label: "Chờ duyệt vòng 1",
        className: "bg-amber-50 text-amber-700 ring-amber-100",
      };

    case "needs_revision_v1":
      return {
        label: "Cần chỉnh sửa",
        className: "bg-rose-50 text-rose-700 ring-rose-100",
      };

    case "submitted_v2":
      return {
        label: "Chờ duyệt vòng 2",
        className: "bg-blue-50 text-blue-700 ring-blue-100",
      };

    case "passed":
      return {
        label: "Đạt",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "failed":
      return {
        label: "Không đạt",
        className: "bg-red-50 text-red-700 ring-red-100",
      };

    case "closed":
      return {
        label: "Đã đóng",
        className: "bg-slate-100 text-slate-700 ring-slate-200",
      };

    default:
      return {
        label: "Nháp",
        className: "bg-slate-100 text-slate-700 ring-slate-200",
      };
  }
}

export default function SubmissionStatusBadge({ status }: { status: string }) {
  const normalized = (status || "draft") as Status;
  const config = getConfig(normalized);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.className}`}
    >
      {config.label}
    </span>
  );
}