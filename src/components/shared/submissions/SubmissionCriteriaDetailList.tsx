type CriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required?: number;
  evidence_type: string;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_count: number;
  review_decision?: string | null;
};

import { AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
import CriteriaReviewDecision from "./CriteriaReviewDecision";

function getStatus(item: CriteriaItem) {
  const autoPassed = Number(item.auto_passed ?? 0) === 1;
  const hasContent = String(item.content_text ?? "").trim().length > 0;
  const hasFile = Number(item.file_count ?? 0) > 0;

  if (autoPassed) return "Đã đạt tự động";
  if (hasContent || hasFile) return "Đã có minh chứng";
  return "Cần bổ sung minh chứng";
}

function getStatusClass(label: string) {
  if (label === "Đã đạt tự động") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (label === "Đã có minh chứng") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  return "bg-amber-50 text-amber-700 ring-amber-100";
}

export default function SubmissionCriteriaDetailList({
  items,
  submissionId,
  canReview=false,
}: {
  items: CriteriaItem[];
  submissionId?: number;
  canReview?: boolean;
}) {
  const groups = Array.from(
    new Map(items.map((item) => [item.group_code, item.group_title])).entries()
  );

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Chi tiết tiêu chí hồ sơ
      </h2>

      <div className="mt-5 space-y-5">
        {groups.map(([groupCode, groupTitle]) => {
          const groupItems = items.filter(
            (item) => item.group_code === groupCode
          );

          return (
            <div key={groupCode} className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">{groupCode}. {groupTitle}</h3><span className="text-sm font-semibold text-slate-700">Đạt {groupItems.filter(item=>Number(item.auto_passed)===1||item.review_decision==="pass").length}/{Number(groupItems[0]?.min_required??0)} tiêu chí</span></div>
              </div>

              <div className="divide-y divide-slate-100">
                {groupItems.map((item) => {
                  const label = getStatus(item);

                  return (
                    <div key={item.code} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {item.code}. {item.title}
                          </div>

                          {item.description ? (
                            <div className="mt-1 text-sm text-slate-500">
                              {item.description}
                            </div>
                          ) : null}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClass(
                            label
                          )}`}
                        >
                          {label}
                        </span>
                      </div>

                      {item.auto_message ? <AutoCriteriaMessage message={item.auto_message} /> : null}

                      {item.content_text ? (
                        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                          <div className="font-medium text-slate-900">
                            Nội dung minh chứng
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {item.content_text}
                          </div>
                        </div>
                      ) : null}

                      {Number(item.file_count ?? 0) > 0 ? (
                        <div className="mt-3 text-sm text-slate-500">
                          Đã tải lên {Number(item.file_count)} file minh chứng.
                        </div>
                      ) : null}

                      {submissionId && Number(item.auto_passed ?? 0)!==1 && (Boolean(item.content_text?.trim())||Number(item.file_count)>0) ? (
                        <CriteriaReviewDecision submissionId={submissionId} criteriaCode={item.code} decision={item.review_decision??null} disabled={!canReview} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
