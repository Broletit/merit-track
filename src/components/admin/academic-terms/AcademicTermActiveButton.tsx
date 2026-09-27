"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { setActiveAcademicTerm } from "@/server/actions/academic-terms/setActiveAcademicTerm";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function AcademicTermActiveButton({
  termId,
  isActive,
}: {
  termId: number;
  isActive: boolean;
}) {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await setActiveAcademicTerm(termId);
        setOk(true);
        setMessage(result.message);
      } catch (error) {
        setOk(false);
        setMessage(
          error instanceof Error ? error.message : "Cập nhật học kỳ thất bại."
        );
      }
    });
  }

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        <CheckCircle2 size={16} />
        Đang áp dụng
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Đang đặt..." : "Đặt hiện hành"}
      </button>

    </div>
  );
}
