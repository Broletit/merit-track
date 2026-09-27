"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { cancelActivityRegistration } from "@/server/actions/activities/cancelActivityRegistration";
import { registerActivity } from "@/server/actions/activities/registerActivity";

export default function StudentActivityRegisterButton({
  activityId,
  disabled,
  label,
  registrationStatus,
  canCancel = false,
}: {
  activityId: number;
  disabled: boolean;
  label: string;
  registrationStatus: string | null;
  canCancel?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [registered, setRegistered] = useState(
    ["registered", "attended"].includes(String(registrationStatus))
  );

  const isDisabled = disabled || pending || (registered && !canCancel);
  const defaultLabel = label === "Đã đăng ký" ? "Đăng ký" : label;

  return (
    <div className="space-y-2">
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
            const result = registered
              ? await cancelActivityRegistration(activityId)
              : await registerActivity(activityId);
            setSuccessMessage(result.message);
            setErrorMessage("");
            setRegistered(!registered);
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
        className={`inline-flex whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          registered && canCancel
            ? "border-red-300 bg-white text-red-700 hover:bg-red-50"
            : "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"
        }`}
      >
        {pending
          ? "Đang xử lý..."
          : registered && canCancel
            ? "Hủy đăng ký"
            : registered
              ? "Đã đăng ký"
              : defaultLabel}
      </button>
    </div>
  );
}
