"use client";

import { useState, useTransition } from "react";
import { approveV2, rejectV2 } from "@/server/actions/submissions/reviewSubmission";
import type { FacultyOfficerSubmissionItem } from "./types";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function FacultyOfficerSubmissionActions({
  item,
}: {
  item: FacultyOfficerSubmissionItem;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  function review(decision: "approve" | "reject") {
    startTransition(async () => {
      try {
        if (decision === "approve") await approveV2(item.id);
        else await rejectV2(item.id);
        setFeedback({ message: decision === "approve" ? "Đã duyệt hồ sơ đạt." : "Đã cập nhật hồ sơ không đạt.", ok: true });
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Không thể xử lý hồ sơ.", ok: false });
      }
    });
  }

  if (item.status !== "submitted_v2") {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <div className="flex justify-center gap-2">
      <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
      <button
        type="button"
        disabled={pending}
        onClick={() => review("approve")}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        Đạt
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => review("reject")}
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
      >
        Không đạt
      </button>
    </div>
  );
}
