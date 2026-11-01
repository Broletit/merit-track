import PaginatedTable from "@/components/common/PaginatedTable";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

type ReviewItem = {
  round: number;
  decision: string;
  note: string | null;
  reviewerName: string | null;
  createdAt?: string | null;
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

function reviewLabel(item: ReviewItem, singleStage = false) {
  if (singleStage) {
    if (item.decision === "pass") return "Đã duyệt đạt";
    if (item.decision === "fail") return "Đã đóng hồ sơ";
    return "Trả về chỉnh sửa";
  }
  if (item.decision === "pass") return `Vòng ${item.round} — Đạt`;
  if (item.decision === "fail") return `Vòng ${item.round} — Không đạt`;
  return `Vòng ${item.round} — Trả về chỉnh sửa`;
}

function timelineLabel(item: SubmissionTimelineItem, submitIndex: number, singleStage = false) {
  if (item.action === "reopen_deadline") return "Gia hạn đợt xét — Mở lại hồ sơ";
  if (item.action === 'finalize') return "Chốt hồ sơ khi kết thúc đợt xét — Không đạt";
  if (item.action === "create_draft") return "Khởi tạo hồ sơ";
  if (item.action === "submit") return submitIndex > 1 ? `Nộp lại hồ sơ lần ${submitIndex}` : "Nộp hồ sơ lần đầu";
  if (singleStage && item.toStatus?.includes("revision")) return "Trả hồ sơ để chỉnh sửa";
  if (item.toStatus === "submitted_v2") return "Hoàn thành duyệt vòng 1";
  if (item.fromStatus === "submitted_v2" && item.toStatus?.includes("revision")) return "Vòng 2 trả hồ sơ để bổ sung";
  if (item.fromStatus === "submitted_v1" && item.toStatus?.includes("revision")) return "Vòng 1 trả hồ sơ để bổ sung";
  if (item.toStatus === "passed") return "Hồ sơ được công nhận đạt";
  if (item.toStatus === "failed") return "Hồ sơ được kết luận không đạt";
  return "Cập nhật xét duyệt";
}

function timelineActorLabel(item: SubmissionTimelineItem, singleStage = false) {
  if (!item.actorName) return null;
  if (singleStage) return `Người xét duyệt: ${item.actorName}`;

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
  singleStage = false,
}: {
  items: ReviewItem[];
  timeline?: SubmissionTimelineItem[];
  title?: string;
  emptyMessage?: string;
  resultsOnly?: boolean;
  singleStage?: boolean;
}) {
  if (items.length === 0 && timeline.length === 0 && !emptyMessage) return null;

  const timestamp = (value?: string | null) => {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : Infinity;
  };
  const orderedTimeline = [...timeline].sort((a, b) =>
    timestamp(a.createdAt) - timestamp(b.createdAt) || a.id - b.id
  );
  const orderedReviews = [...items].sort((a, b) =>
    timestamp(a.createdAt) - timestamp(b.createdAt) || a.round - b.round
  );

  const rows = !resultsOnly && timeline.length > 0
    ? orderedTimeline.map((item, index) => ({
        key: `timeline-${item.id}`,
        title: timelineLabel(item, orderedTimeline.slice(0, index + 1).filter(entry => entry.action === "submit").length, singleStage),
        time: formatDateTimeVN(item.createdAt),
        actor: timelineActorLabel(item, singleStage) || "—",
        note: ["review", "finalize"].includes(item.action) && item.message !== "Cập nhật trạng thái xét duyệt." ? item.message : null,
      }))
    : orderedReviews.map((item, index) => ({
        key: `review-${item.round}-${index}`,
        title: reviewLabel(item, singleStage),
        time: item.createdAt ? formatDateTimeVN(item.createdAt) : "—",
        actor: item.reviewerName ? `${singleStage ? "Người xét duyệt" : `Cán bộ xét vòng ${item.round}`}: ${item.reviewerName}` : "—",
        note: item.note,
      }));

  return (
    <section className={`min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 shadow-slate-200/60 ${singleStage ? "sm:p-5" : "sm:p-6"}`}>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {rows.length ? (
        <PaginatedTable containerClassName="mt-5" resultLabel="bản ghi" showResultCount={!singleStage} paginate={!singleStage}
          className="w-full! min-w-0! table-fixed! [&_tr::before]:px-1! [&_th]:whitespace-nowrap! [&_td]:whitespace-normal! [&_td_div]:whitespace-normal!  [&_td]:[overflow-wrap:anywhere]">
          <colgroup><col style={{width:"5%"}}/><col style={{width:singleStage?"35%":"28%"}}/><col style={{width:singleStage?"22%":"19%"}}/>{!singleStage ? <col style={{width:"21%"}}/> : null}<col style={{width:singleStage?"38%":"27%"}}/></colgroup>
          <thead className="bg-blue-800 text-white"><tr>
            <th data-column-align="left" className="px-2 py-3 text-sm">Giai đoạn</th>
            <th className="px-2 py-3 text-sm">Thời gian</th>
            {!singleStage ? <th className="px-2 py-3 text-sm">Người thực hiện</th> : null}
            <th data-column-align="left" className="px-2 py-3 text-sm">Nội dung phản hồi</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => <tr key={row.key} className="even:bg-slate-50/60 hover:bg-blue-50/50">
              <td data-column-align="left" className="px-2 py-3 text-sm font-medium text-slate-900">{row.title}</td>
              <td className="px-2 py-3 text-sm text-slate-700">{row.time}</td>
              {!singleStage ? <td className="px-2 py-3 text-sm text-slate-700">{row.actor}</td> : null}
              <td data-column-align="left" className="whitespace-pre-line! px-2 py-3 text-sm text-slate-700">{row.note || "—"}</td>
            </tr>)}
          </tbody>
        </PaginatedTable>
      ) : (
        <div className="mt-5 rounded-none border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
          {emptyMessage || "Chưa có kết quả xét duyệt."}
        </div>
      )}
    </section>
  );
}
