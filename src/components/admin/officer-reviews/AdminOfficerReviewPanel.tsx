"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewOfficerSubmission } from "@/server/actions/admin/officer-reviews/reviewOfficerSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function AdminOfficerReviewPanel({
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
  const [ok, setOk] = useState(false);

  function submit(decision: "pass" | "revise" | "fail") {
    setMessage("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("decision", decision);
        formData.set("note", note);

        const result = await reviewOfficerSubmission(submissionId, formData);
        setOk(true);
        setMessage(result.message || "Đã xử lý hồ sơ.");
        router.refresh();
      } catch (error) {
        setOk(false);
        setMessage(error instanceof Error ? error.message : "Không thể xử lý hồ sơ.");
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <h2 className="text-xl font-semibold text-slate-900">
        Duyệt hồ sơ cán bộ
      </h2>

      {!canReview ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
          Hồ sơ đã được xử lý. Bạn chỉ có thể xem lại.
        </div>
      ) : (
        <>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Nhập phản hồi cho cán bộ..."
            className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("pass")}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Duyệt đạt
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => submit("revise")}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              Trả chỉnh sửa
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => submit("fail")}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              Không đạt
            </button>
          </div>
        </>
      )}

    </section>
  );
}
