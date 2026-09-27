"use client";

import { useEffect, useId } from "react";
import toast from "react-hot-toast";

export default function ActionFeedback({
  pending = false,
  message = "",
  ok = false,
  neutral = false,
}: {
  pending?: boolean;
  message?: string;
  ok?: boolean;
  neutral?: boolean;
}) {
  const feedbackId = useId();

  useEffect(() => {
    if (pending || !message) return;
    const toastId = `action-feedback-${feedbackId}`;
    if (neutral) toast(message, { id: toastId, icon: "ℹ️" });
    else if (ok) toast.success(message, { id: toastId });
    else {
      toast.error(message, { id: toastId });
      window.dispatchEvent(new CustomEvent("app:action-error", { detail: { message } }));
    }
  }, [feedbackId, message, neutral, ok, pending]);

  if (!pending) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-sky-100/90 shadow-[0_1px_6px_rgba(14,165,233,0.3)]" role="status" aria-label="Đang xử lý">
      <div className="top-loading-gradient h-full w-[38%]" />
    </div>
  );
}
