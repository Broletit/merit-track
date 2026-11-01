"use client";
import { preserveDialogScroll } from "@/lib/ui/dialogScroll";
import { useEffect, useId, useRef } from "react";
import toast, { resolveValue, useToaster } from "react-hot-toast";
import { CheckCircle2, CircleX, Info, LoaderCircle } from "lucide-react";

export default function AppToaster() {
  const { toasts } = useToaster({ duration: 7000 });
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const visible = toasts.filter(item => item.visible);
  const seen = new Set<string>();
  const notifications = visible.filter(item => {
    const message = resolveValue(item.message, item);
    if (typeof message !== 'string') return true;
    const key = item.type + ':' + message;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const open = notifications.length > 0;
  useEffect(() => {
    if (open && !dialog.current?.open) preserveDialogScroll(() => dialog.current?.showModal());
    if (!open) preserveDialogScroll(() => dialog.current?.close());
  }, [open]);
  function dismiss() { visible.forEach(item => toast.dismiss(item.id)); }
  return <dialog ref={dialog} aria-labelledby={titleId} aria-live="polite"
    onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
    className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-left shadow-xl backdrop:bg-slate-900/50">
    <div className="p-5 sm:p-6">
      <h2 id={titleId} className="text-lg font-semibold text-slate-900">Thông báo</h2>
      <div className="mt-4 max-h-[60dvh] space-y-3 overflow-y-auto">
        {notifications.map(item => {
          const success = item.type === 'success', error = item.type === 'error', loading = item.type === 'loading';
          const Icon = success ? CheckCircle2 : error ? CircleX : loading ? LoaderCircle : Info;
          const color = success ? 'bg-emerald-50 text-emerald-700' : error ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700';
          return <div key={item.id} role={error ? 'alert' : 'status'} className={'flex items-start gap-3 rounded-xl p-4 ' + color}>
            <Icon size={24} className={'mt-0.5 shrink-0 ' + (loading ? 'animate-spin' : '')}/>
            <div className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6">{resolveValue(item.message, item)}</div>
          </div>;
        })}
      </div>
      <div className="mt-5 flex justify-end"><button type="button" onClick={dismiss} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Đóng</button></div>
    </div>
  </dialog>;
}
