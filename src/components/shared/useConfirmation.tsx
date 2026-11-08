"use client";
import { preserveDialogScroll } from "@/lib/ui/dialogScroll";
import RequiredMark from "@/components/common/RequiredMark";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Confirmation = { title: string; message: string; confirmLabel?: string; cancelLabel?: string; requireReason?: boolean };
export default function useConfirmation() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolver = useRef<((reason: string | null) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  useEffect(() => {
    if (request) preserveDialogScroll(() => dialog.current?.showModal());
  }, [request]);
  useEffect(() => () => { resolver.current?.(null); }, []);
  function finish(reason: string | null) {
    preserveDialogScroll(() => dialog.current?.close());
    resolver.current?.(reason);
    resolver.current = null;
    setRequest(null);
  }
  function confirm(options: Confirmation): Promise<string | null> {
    resolver.current?.(null);
    return new Promise(resolve => { resolver.current = resolve; setRequest(options); });
  }
  const modal = request ? createPortal(<dialog ref={dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); finish(null); }}
    onClick={event => { if (event.target === event.currentTarget) finish(null); }}
    className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border-0 bg-white p-0 text-left shadow-xl backdrop:bg-slate-900/50">
    <form className="p-5" onSubmit={event => {
      event.preventDefault();
      const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim();
      if (request.requireReason && reason.length < 10) {
        const input = event.currentTarget.elements.namedItem('reason') as HTMLTextAreaElement;
        input.setCustomValidity('Vui lòng nhập lý do tối thiểu 10 ký tự.'); input.reportValidity(); return;
      }
      finish(reason);
    }}>
      <h2 id={titleId} className="whitespace-normal! text-lg font-semibold text-slate-900">{request.title}</h2>
      <p className="mt-2 whitespace-normal! text-sm text-slate-600">{request.message}</p>
      {request.requireReason ? <div className="mt-4 whitespace-normal!">
        <label htmlFor={reasonId} className="text-sm font-medium text-slate-700">Lý do xóa<RequiredMark required={true}/></label>
        <textarea id={reasonId} name="reason" required minLength={10} rows={3}
          onInput={event => event.currentTarget.setCustomValidity('')}
          className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm" placeholder="Nhập lý do (tối thiểu 10 ký tự)" />
      </div> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => finish(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">{request.cancelLabel ?? 'Đóng'}</button>
        <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700">{request.confirmLabel ?? 'Xác nhận'}</button>
      </div>
    </form>
  </dialog>, document.body) : null;
  return { confirm, modal };
}
