"use client";
import FieldError from "@/components/common/FieldError";
import { useRouter } from "next/navigation";
import RequiredMark from "@/components/common/RequiredMark";


import { useRef, useState, useTransition } from "react";
import { AlertTriangle, FileSpreadsheet, FileUp } from "lucide-react";
import toast from "react-hot-toast";
import { importFacultyAttendance } from "@/server/actions/activities/importFacultyAttendance";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function FacultyAttendanceImport({ activityId }: { activityId: number }) {
  const router = useRouter();
  const [revision,setRevision] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ file?: string; reason?: string }>({});
  const [fileName, setFileName] = useState("");
  const [confirmation, setConfirmation] = useState<{ message: string; users: Array<{ mssv: string; fullName: string; classLabel: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
      <h2 className="text-lg font-semibold text-slate-900">Nhập danh sách tham gia và cộng điểm</h2>
      <ActionFeedback pending={pending} message={error} ok={false} />
      {confirmation ? <div className="mt-4 rounded-none border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-md shadow-slate-200/60"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0" size={19}/><div className="min-w-0"><p className="font-semibold">Cần xác nhận sinh viên chưa đăng ký</p><p className="mt-1">{confirmation.message}</p><div className="mt-3 max-h-40 overflow-y-auto rounded-none border border-amber-200 bg-white/70"><ul className="divide-y divide-amber-100">{confirmation.users.map((user)=><li key={user.mssv} className="px-3 py-2"><span className="font-medium">{user.fullName}</span> · {user.mssv} · {user.classLabel}</li>)}</ul></div><button type="button" disabled={pending} onClick={()=>{if(confirmInputRef.current)confirmInputRef.current.value="1";formRef.current?.requestSubmit();}} className="mt-3 rounded-xl border border-amber-700 bg-white px-4 py-2 font-semibold text-amber-800">Tôi xác nhận các sinh viên trên đã đăng ký và tham gia</button></div></div></div> : null}
      <form key={revision} noValidate data-stable-validation ref={formRef} className="mt-5 grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]" onSubmit={(event) => {
        event.preventDefault(); setError("");
        const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
        const nextErrors = {
          file: fileInputRef.current?.files?.length ? undefined : "Vui lòng chọn file danh sách.",
          reason: !reason ? "Vui lòng nhập lý do." : reason.length < 10 ? "Lý do phải có ít nhất 10 ký tự." : undefined,
        };
        setFieldErrors(nextErrors);
        if (nextErrors.file || nextErrors.reason) return;
        const form = event.currentTarget; const formData = new FormData(form);
        startTransition(async () => { try { const result = await importFacultyAttendance(activityId, formData); if(result.requiresConfirmation){setConfirmation({message:result.message,users:result.unregistered});toast.error("Danh sách có sinh viên chưa đăng ký. Vui lòng kiểm tra và xác nhận.");return;} toast.success(result.message, { id: `activity-import-${activityId}` }); setRevision(value=>value+1); setFileName(""); setFieldErrors({}); setConfirmation(null); router.refresh(); } catch (caught) { const message = caught instanceof Error ? caught.message : "Không thể nhập danh sách.";
          if (/lý do/i.test(message)) setFieldErrors(previous => ({ ...previous, reason: message }));
          else if (/vui lòng chọn.*(?:file|tệp)/i.test(message)) setFieldErrors(previous => ({ ...previous, file: message }));
          else setError(message); } });
      }}>
        <input ref={confirmInputRef} type="hidden" name="confirmUnregistered" defaultValue="0"/>
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <label htmlFor={`attendance-file-${activityId}`} className="mb-2 block text-sm font-medium text-slate-600">File danh sách<RequiredMark /></label>
        <div className="flex h-11 min-w-0 items-stretch overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex shrink-0 items-center gap-2 border-r border-blue-700 bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800">
            <FileUp size={16}/><span>Chọn tệp<RequiredMark/></span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-sm">
            <FileSpreadsheet size={17} className={fileName ? "shrink-0 text-emerald-600" : "shrink-0 text-slate-400"}/>
            <div className="min-w-0"><div className={`truncate ${fileName ? "font-medium text-slate-800" : "text-slate-500"}`}>{fileName || "Chưa chọn tệp"}</div><div className="text-[11px] text-slate-400">XLSX, XLS hoặc CSV</div></div>
          </div>
          <input ref={fileInputRef} id={`attendance-file-${activityId}`} name="file" type="file" required aria-invalid={Boolean(fieldErrors.file)} aria-describedby={fieldErrors.file ? `attendance-file-error-${activityId}` : undefined} accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => {setFileName(event.target.files?.[0]?.name ?? "");setFieldErrors(previous => ({...previous, file: undefined}));setConfirmation(null);if(confirmInputRef.current)confirmInputRef.current.value="0";}}/>
        </div>
        <FieldError id={`attendance-file-error-${activityId}`} message={fieldErrors.file} />
        </div>
        <label className="min-w-0"><span className="mb-2 block text-sm font-medium text-slate-600">Cách nhập</span>
        <select name="mode" className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="append">Nhập bổ sung</option><option value="replace">Thay thế danh sách</option>
        </select>
        </label>
        <label className="required-field-control min-w-0 sm:col-span-2 sm:row-start-2 xl:col-span-1 xl:row-auto"><span className="mb-2 block text-sm font-medium text-slate-600">Lý do<RequiredMark required={true}/></span><input name="reason" required minLength={10} aria-invalid={Boolean(fieldErrors.reason)} aria-describedby={fieldErrors.reason ? `attendance-reason-error-${activityId}` : undefined} onChange={() => setFieldErrors(previous => ({...previous, reason: undefined}))} placeholder="Lý do nhập/thay thế dữ liệu..." className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" /><FieldError id={`attendance-reason-error-${activityId}`} message={fieldErrors.reason} /></label>
        <button disabled={pending} className="min-h-11 h-auto w-full whitespace-normal rounded-xl bg-blue-700 xl:mt-7 px-4 text-sm font-semibold text-white disabled:opacity-60 py-2 max-w-full break-words">{pending ? "Đang nhập..." : "Nhập file"}</button>
      </form>
    </section>
  );
}
