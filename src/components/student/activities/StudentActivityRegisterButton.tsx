"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { registerActivity } from "@/server/actions/activities/registerActivity";

export default function StudentActivityRegisterButton({
  activityId,
  disabled,
  label,
  registrationStatus,
}: {
  activityId: number;
  disabled: boolean;
  label: string;
  registrationStatus: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [registered, setRegistered] = useState(
    ["registered", "attended"].includes(String(registrationStatus))
  );

  const isDisabled = disabled || pending || registered;
  const defaultLabel = label === "Đã đăng ký" ? "Đăng ký" : label;

  return (
    <div className="min-w-[10rem] w-full space-y-2">
      <ActionFeedback
        pending={pending}
        message={successMessage || errorMessage}
        ok={Boolean(successMessage)}
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => startTransition(async () => {
          try {
            const result = await registerActivity(activityId);
            setSuccessMessage(result.message);
            setErrorMessage("");
            setRegistered(true);
            router.refresh();
          } catch (error) {
            setSuccessMessage("");
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Không thể cập nhật đăng ký hoạt động."
            );
          }
        })}
        className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-xl border border-blue-700 bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Đang xử lý..."
          : registered
              ? "Đã đăng ký"
              : defaultLabel}
      </button>
    </div>
  );
}
