"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { reviewSubmission } from "@/server/actions/reviews/reviewSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function FacultyOfficerReviewPanel({
  submissionId,
  canReview,
  reviewRound,
  requirementsMet,
}: {
  submissionId: number;
  canReview: boolean;
  reviewRound: 1 | 2;
  requirementsMet: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noteError, setNoteError] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  async function submit(decision: "approve" | "revision" | "reject") {
    setMessage("");
    setError("");

    if (decision === "revision" && !note.trim()) {
      setError("Vui lòng nhập phản hồi trước khi trả hồ sơ về chỉnh sửa.");
      setNoteError(true);
      noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      noteRef.current?.focus({ preventScroll: true });
      return;
    }
    setNoteError(false);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("note", note);

        const result = await reviewSubmission(submissionId, decision, formData);

        setMessage(result.message || "Xử lý thành công.");
        if (decision === "approve") {
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.set("mode", "view");
          router.replace(`${pathname}?${nextParams.toString()}`);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể xử lý hồ sơ.");
      }
    });
  }

  return (
    <section id="review-panel" className="scroll-mt-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={pending} message={message || error} ok={Boolean(message)} />
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Duyệt hồ sơ vòng {reviewRound}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Kiểm tra hồ sơ trước khi duyệt hoàn tất.
        </p>
      </div>

      {!canReview ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
          Hồ sơ hiện không ở trạng thái chờ duyệt. Bạn chỉ có thể xem lại
          nội dung và lịch sử xử lý.
        </div>
      ) : (
        <>
          {!requirementsMet ? <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Phản hồi cho sinh viên
            </label>

            <textarea
              ref={noteRef}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                if (event.target.value.trim()) setNoteError(false);
              }}
              rows={5}
              placeholder="Nhập phản hồi nếu cần chỉnh sửa hồ sơ..."
              className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${noteError ? "border-red-500 ring-2 ring-red-100 focus:border-red-500" : "border-slate-200 focus:border-blue-500"}`}
            />
          </div> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {requirementsMet ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("approve")}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Đang xử lý..." : "Duyệt hoàn tất"}
            </button>
            ) : (
            <>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("revision")}
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Đang xử lý..." : "Trả về chỉnh sửa"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => submit("reject")}
              className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Đang xử lý..." : "Đóng hồ sơ"}
            </button>
            </>
            )}
          </div>
        </>
      )}

    </section>
  );
}
