"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerOfficerActivity } from "@/server/actions/officer-activities/registerOfficerActivity";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function RegisterOfficerActivityButton({
  activityId,
  disabled,
  label,
}: {
  activityId: number;
  disabled: boolean;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [registered, setRegistered] = useState(label === "Đã đăng ký");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  const isDisabled = disabled || pending || registered;
  const buttonLabel = registered ? "Đã đăng ký" : label;

  return (
    <div className="space-y-2">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await registerOfficerActivity(activityId);
              setRegistered(true);
              setOk(true);
              setMessage(result.message || "Đăng ký thành công.");
              router.refresh();
            } catch (error) {
              setOk(false);
              setMessage(
                error instanceof Error ? error.message : "Đăng ký thất bại."
              );
            }
          })
        }
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Đang xử lý..." : buttonLabel}
      </button>

    </div>
  );
}
