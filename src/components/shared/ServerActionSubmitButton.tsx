"use client";

import { useFormStatus } from "react-dom";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function ServerActionSubmitButton({
  idleLabel,
  pendingLabel = "Đang xử lý...",
  className,
}: {
  idleLabel: string;
  pendingLabel?: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <ActionFeedback pending={pending} />
      <button type="submit" disabled={pending} className={className}>
        {pending ? pendingLabel : idleLabel}
      </button>
    </>
  );
}
