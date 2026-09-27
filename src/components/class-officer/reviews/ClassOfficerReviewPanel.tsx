"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewSubmission } from "@/server/actions/reviews/reviewSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function ClassOfficerReviewPanel({
  submissionId,
  canReview,
}: {
  submissionId: number;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(decision: "approve" | "revision") {
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("note", note);

        const result = await reviewSubmission(submissionId, decision, formData);

        setMessage(result.message || "Xử lý thành công.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể xử lý hồ sơ.");
      }
    });
  }

  return (
    <section className="sticky top-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message || error} ok={Boolean(message)} />
      <h2 className="text-xl font-semibold text-slate-900">
        Duyệt hồ sơ vòng 1
      </h2>

      {!canReview ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
          Hồ sơ đã được xử lý vòng 1. Bạn chỉ có thể xem lại nội dung và lịch sử.
        </div>
      ) : (
        <>
          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Phản hồi cho sinh viên
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="Nhập phản hồi nếu cần chỉnh sửa hồ sơ..."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("approve")}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Đang xử lý..." : "Duyệt vòng 1"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => submit("revision")}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? "Đang xử lý..." : "Trả về chỉnh sửa"}
            </button>
          </div>
        </>
      )}

    </section>
  );
}
