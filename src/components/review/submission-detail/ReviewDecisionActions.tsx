"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  approveV1,
  rejectV1,
  approveV2,
  rejectV2,
} from "@/server/actions/submissions/reviewSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function ReviewDecisionActions({
  submissionId,
  stage,
}: {
  submissionId: number;
  stage: "v1" | "v2";
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  function review(decision: "approve" | "reject") {
    startTransition(async () => {
      try {
        if (stage === "v1") {
          if (decision === "approve") await approveV1(submissionId);
          else await rejectV1(submissionId);
        } else if (decision === "approve") await approveV2(submissionId);
        else await rejectV2(submissionId);

        setFeedback({
          message: decision === "approve" ? `Đã duyệt hồ sơ ${stage === "v1" ? "vòng 1" : "vòng 2"}.` : stage === "v1" ? "Đã yêu cầu bổ sung hồ sơ." : "Đã cập nhật hồ sơ không đạt.",
          ok: true,
        });
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Không thể xử lý hồ sơ.", ok: false });
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
      <h2 className="text-xl font-semibold text-slate-900">Thao tác duyệt</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => review("approve")}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          {stage === "v1" ? "Duyệt vòng 1" : "Duyệt vòng 2"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => review("reject")}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          <XCircle size={16} />
          {stage === "v1" ? "Yêu cầu bổ sung" : "Không đạt"}
        </button>
      </div>
    </section>
  );
}
