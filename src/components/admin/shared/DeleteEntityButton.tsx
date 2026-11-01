"use client";
import useConfirmation from "@/components/shared/useConfirmation";

import { useState, useTransition } from "react";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DeleteEntityButton({ label, confirmMessage, action, disabled = false, disabledReason = "Không thể xóa vì đã có dữ liệu liên quan" }: { label: string; confirmMessage: string; action: (formData?: FormData) => Promise<{ message: string }>; disabled?: boolean; disabledReason?: string }) {
  const [pending, startTransition] = useTransition();
  const router=useRouter();
  const { confirm, modal } = useConfirmation();
  const [feedback, setFeedback] = useState({ message: "", ok: false });
  return <>
    {modal}
      <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
    <button type="button" title={disabled ? disabledReason : label} aria-label={label} disabled={disabled || pending} onClick={async () => {
      const reason = await confirm({ title: 'Xác nhận xóa', message: confirmMessage, confirmLabel: 'Xác nhận xóa', requireReason: true });
      if (reason === null) return;
      const formData=new FormData();formData.set("reason",reason);
      startTransition(async () => {
        try { const result = await action(formData); toast.success(result.message, {id:`delete-success-${label}-${confirmMessage}`}); setFeedback({ message: "", ok: true }); router.refresh(); }
        catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể xóa dữ liệu.", ok: false }); }
      });
    }} className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
      {pending ? "Đang xóa..." : label}
    </button>
  </>;
}
