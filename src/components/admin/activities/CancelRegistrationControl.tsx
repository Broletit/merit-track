"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelRegistrationAdmin } from "@/server/actions/activities/cancelRegistrationAdmin";
import ActionFeedback from "@/components/shared/ActionFeedback";
import useConfirmation from "@/components/shared/useConfirmation";

export default function CancelRegistrationControl({ registrationId }: { registrationId: number }) {
  const router = useRouter();
  const { confirm, modal } = useConfirmation();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState({ ok: false, message: '' });
  return <>
    {modal}
    <ActionFeedback pending={pending} ok={state.ok} message={state.message} />
    <button type="button" disabled={pending} onClick={async () => {
      const confirmed = await confirm({ title: 'Xác nhận hủy đăng ký', message: 'Bạn có chắc muốn hủy đăng ký của sinh viên này?', confirmLabel: 'Xác nhận hủy' });
      if (confirmed === null) return;
      const form = new FormData(); form.set('registrationId', String(registrationId));
      startTransition(async () => {
        try {
          const result = await cancelRegistrationAdmin(state, form);
          setState(result);
          if (result.ok) router.refresh();
        }
        catch { setState({ok:false,message:'Không thể hủy đăng ký. Vui lòng thử lại.'}); }
      });
    }} className="rounded-lg px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50">{pending ? 'Đang hủy...' : 'Hủy đăng ký'}</button>
  </>;
}
