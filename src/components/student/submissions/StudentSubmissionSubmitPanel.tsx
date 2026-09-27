"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { submitStudentSubmission } from "@/server/actions/submissions/submitStudentSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function StudentSubmissionSubmitPanel({
  submissionId,
  editable,
}: {
  submissionId: number;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  function submit() {
    setMessage("");
    setOk(false);

    startTransition(async () => {
      try {
        const result = await submitStudentSubmission(submissionId);
        setOk(true);
        setMessage(result.message);
        router.refresh();
      } catch (error) {
        setOk(false);
        setMessage(
          error instanceof Error ? error.message : "Không thể gửi hồ sơ."
        );
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Gửi hồ sơ xét duyệt
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Hệ thống sẽ kiểm tra các tiêu chí cần minh chứng trước khi gửi.
          </p>
        </div>

        <button
          type="button"
          disabled={!editable || pending}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={16} />
          {pending ? "Đang gửi..." : "Gửi hồ sơ"}
        </button>
      </div>

      {!editable ? (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
          Hồ sơ hiện không thể chỉnh sửa hoặc gửi lại.
        </div>
      ) : null}

    </section>
  );
}
