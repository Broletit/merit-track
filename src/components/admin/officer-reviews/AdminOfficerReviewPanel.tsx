"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { reviewOfficerSubmission } from "@/server/actions/admin/officer-reviews/reviewOfficerSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function AdminOfficerReviewPanel({
  submissionId,
  canReview,
  requirementsMet,
}: {
  submissionId: number;
  canReview: boolean;
  requirementsMet: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [noteError, setNoteError] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  function submit(decision: "pass" | "revise" | "fail") {
    setMessage("");

    if (decision === "revise" && !note.trim()) {
      setOk(false);
      setMessage("Vui lòng nhập phản hồi trước khi trả hồ sơ về chỉnh sửa.");
      setNoteError(true);
      noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      noteRef.current?.focus({ preventScroll: true });
      return;
    }
    setNoteError(false);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("decision", decision);
        formData.set("note", note);

        const result = await reviewOfficerSubmission(submissionId, formData);
        setOk(true);
        setMessage(result.message || "Đã xử lý hồ sơ.");
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("mode", "view");
        router.replace(`${pathname}?${nextParams.toString()}`);
      } catch (error) {
        setOk(false);
        setMessage(error instanceof Error ? error.message : "Không thể xử lý hồ sơ.");
      }
    });
  }

  return (
    <section id="review-panel" className="scroll-mt-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <h2 className="text-xl font-semibold text-slate-900">
        Duyệt hồ sơ cán bộ
      </h2>

      {!canReview ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
          Hồ sơ đã được xử lý. Bạn chỉ có thể xem lại.
        </div>
      ) : (
        <>
          {!requirementsMet ? <textarea
            ref={noteRef}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (event.target.value.trim()) setNoteError(false);
            }}
            rows={4}
            placeholder="Nhập phản hồi cho cán bộ..."
            className={`mt-5 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${noteError ? "border-red-500 ring-2 ring-red-100 focus:border-red-500" : "border-slate-200 focus:border-blue-500"}`}
          /> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {requirementsMet ? <button
              type="button"
              disabled={pending}
              onClick={() => submit("pass")}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Duyệt hoàn tất
            </button>
            : <>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("revise")}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              Trả về chỉnh sửa
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => submit("fail")}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              Đóng hồ sơ
            </button>
            </>}
          </div>
        </>
      )}

    </section>
  );
}
