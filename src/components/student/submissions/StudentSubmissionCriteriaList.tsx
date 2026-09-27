"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import SubmissionEvidenceViewer from "@/components/shared/submissions/SubmissionEvidenceViewer";

type CriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  evidence_type: string;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_count: number;
  review_decision: string | null;
  review_round: number | null;
  files: Array<{ id: number; fileName: string; mimeType: string }>;
};

function getEvidenceStatus(item: CriteriaItem) {
  const autoPassed = Number(item.auto_passed ?? 0) === 1;
  const fileCount = Number(item.file_count ?? 0);
  const hasContent = String(item.content_text ?? "").trim().length > 0;

  if (autoPassed) return "Đã đạt";
  if (item.review_decision === "pass") return `Đạt vòng ${item.review_round}`;
  if (item.review_decision === "fail") return `Chưa đạt vòng ${item.review_round}`;
  if (fileCount > 0 || hasContent) return "Đã nộp minh chứng";
  return "Cần bổ sung minh chứng";
}

function getEvidenceClass(item: CriteriaItem) {
  const label = getEvidenceStatus(item);

  if (label === "Đã đạt" || label.startsWith("Đạt vòng")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (label === "Đã nộp minh chứng") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (label.startsWith("Chưa đạt vòng")) return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

export default function StudentSubmissionCriteriaList({
  items,
  editable,
  editHref,
}: {
  items: CriteriaItem[];
  editable: boolean;
  editHref?: string;
}) {
  const groups = Array.from(
    new Map(items.map((item) => [item.group_code, item.group_title])).entries()
  );

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Chi tiết tiêu chí
          </h2>
        </div>

        {editable&&editHref?<Link href={editHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Pencil size={15}/>Chỉnh sửa</Link>:<span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">Chỉ xem</span>}
      </div>

      <div className="mt-5 space-y-5">
        {groups.map(([groupCode, groupTitle]) => {
          const groupItems = items.filter((item) => item.group_code === groupCode);

          return (
            <div key={groupCode} className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-semibold text-slate-900">
                  {groupCode}. {groupTitle}
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {groupItems.map((item) => (
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
                        {Number(item.auto_passed ?? 0) === 1 ? <AutoCriteriaMessage message={item.auto_message} /> : null}
                      </div>

                      {Number(item.auto_passed ?? 0) === 1 ? <AutoCriteriaBadge /> : <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getEvidenceClass(
                          item
                        )}`}
                      >
                        {getEvidenceStatus(item)}
                      </span>}
                    </div>

                    {item.content_text ? (
                      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-blue-700">
                          Xem minh chứng
                        </summary>
                        <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700">
                          <div className="whitespace-pre-wrap">{item.content_text}</div>
                        </div>
                      </details>
                    ) : null}

                    {item.files.length > 0 ? (
                      <div className="mt-3">
                        <SubmissionEvidenceViewer items={item.files} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
import { AutoCriteriaBadge, AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
