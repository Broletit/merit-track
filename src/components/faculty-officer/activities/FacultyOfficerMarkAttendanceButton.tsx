"use client";

import { useState, useTransition } from "react";
import { markActivityAttendance } from "@/server/actions/activities/manageActivityAttendance";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function FacultyOfficerMarkAttendanceButton({
  registrationId,
  disabled,
}: {
  registrationId: number;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  return (
    <>
    <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await markActivityAttendance(registrationId);
            setFeedback({ message: result.message, ok: true });
          } catch (error) {
            setFeedback({ message: error instanceof Error ? error.message : "Không thể xác nhận tham gia.", ok: false });
          }
        })
      }
      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "Đang xác nhận..." : "Xác nhận tham gia"}
    </button>
    </>
  );
}
