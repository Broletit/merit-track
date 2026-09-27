type ReviewItem = {
  round: number;
  decision: string;
  note: string | null;
  reviewerName: string | null;
};

export type SubmissionTimelineItem = {
  id: number;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  message: string | null;
  actorName: string | null;
  createdAt: string;
};

function reviewLabel(item: ReviewItem) {
  if (item.decision === "pass") return `Vòng ${item.round} — Đạt`;
  if (item.decision === "fail") return `Vòng ${item.round} — Không đạt`;
  return `Vòng ${item.round} — Trả về chỉnh sửa`;
}

function timelineLabel(item: SubmissionTimelineItem, submitIndex: number) {
  if (item.action === "create_draft") return "Khởi tạo hồ sơ";
  if (item.action === "submit") return submitIndex > 1 ? `Nộp lại hồ sơ lần ${submitIndex}` : "Nộp hồ sơ lần đầu";
  if (item.toStatus === "submitted_v2") return "Hoàn thành duyệt vòng 1";
  if (item.fromStatus === "submitted_v2" && item.toStatus?.includes("revision")) return "Vòng 2 trả hồ sơ để bổ sung";
  if (item.fromStatus === "submitted_v1" && item.toStatus?.includes("revision")) return "Vòng 1 trả hồ sơ để bổ sung";
  if (item.toStatus === "passed") return "Hồ sơ được công nhận đạt";
  if (item.toStatus === "failed") return "Hồ sơ được kết luận không đạt";
  return "Cập nhật xét duyệt";
}

function timelineActorLabel(item: SubmissionTimelineItem) {
  if (!item.actorName) return null;

  const isRoundOneReview =
    item.toStatus === "submitted_v2" ||
    (item.fromStatus === "submitted_v1" && item.toStatus?.includes("revision"));
  if (isRoundOneReview) return `Cán bộ xét vòng 1: ${item.actorName}`;

  const isRoundTwoReview =
    ["passed", "failed"].includes(item.toStatus ?? "") ||
    (item.fromStatus === "submitted_v2" && item.toStatus?.includes("revision"));
  if (isRoundTwoReview) return `Cán bộ xét vòng 2: ${item.actorName}`;

  return `Người thực hiện: ${item.actorName}`;
}

export default function ReviewHistory({
  items,
  timeline = [],
  title = "Hành trình xét duyệt",
  emptyMessage,
  resultsOnly = false,
}: {
  items: ReviewItem[];
  timeline?: SubmissionTimelineItem[];
  title?: string;
  emptyMessage?: string;
  resultsOnly?: boolean;
}) {
  if (items.length === 0 && timeline.length === 0 && !emptyMessage) return null;

  const submissionCount = timeline.filter((item) => item.action === "submit").length;
  const revisionCount = timeline.filter((item) => item.toStatus?.includes("revision")).length;
  const completedRounds = new Set(
    timeline
      .filter((item) => item.toStatus === "submitted_v2" || ["passed", "failed"].includes(item.toStatus ?? ""))
      .map((item) => (item.toStatus === "submitted_v2" ? 1 : 2)),
  ).size;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>

      {items.length === 0 && timeline.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : null}

      {!resultsOnly && timeline.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Summary label="Số lần nộp" value={submissionCount} />
          <Summary label="Số lần yêu cầu bổ sung" value={revisionCount} />
          <Summary label="Vòng đã hoàn tất" value={`${completedRounds}/2`} />
        </div>
      ) : null}

      {resultsOnly && items.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Kết quả từng vòng</h3>
          <div className="mt-3 space-y-3">
            {items.map((item, index) => (
              <div key={`${item.round}-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">{reviewLabel(item)}</div>
                <p className="mt-2 text-sm text-slate-700">
                  {item.note || "Kết quả đã được ghi nhận nhưng không có ghi chú chi tiết."}
                </p>
                {item.reviewerName ? <div className="mt-2 text-xs text-slate-500">Người duyệt: {item.reviewerName}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : resultsOnly && timeline.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
          {emptyMessage || "Chưa có kết quả xét duyệt từng vòng."}
        </div>
      ) : null}

      {!resultsOnly && timeline.length > 0 ? (
        <div className="mt-5 space-y-3">
          {timeline.map((item, index) => {
            const currentSubmitIndex = timeline
              .slice(0, index + 1)
              .filter((timelineItem) => timelineItem.action === "submit").length;
            const itemTitle = timelineLabel(item, currentSubmitIndex);
            const actorLabel = timelineActorLabel(item);
            return (
              <div key={item.id} className="relative rounded-2xl bg-slate-50 p-4 pl-11 ring-1 ring-slate-200">
                <div className="absolute left-4 top-5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                  {index + 1}
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{itemTitle}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTimeVN(item.createdAt)}
                      {actorLabel ? ` · ${actorLabel}` : ""}
                    </div>
                  </div>
                  {item.toStatus ? <SubmissionStatusBadge status={item.toStatus} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
      <div className="text-xs font-medium text-blue-600">{label}</div>
      <div className="mt-1 text-lg font-bold text-blue-900">{value}</div>
    </div>
  );
}
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
