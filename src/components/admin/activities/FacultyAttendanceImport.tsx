"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, FileSpreadsheet, FileUp } from "lucide-react";
import toast from "react-hot-toast";
import { importFacultyAttendance } from "@/server/actions/activities/importFacultyAttendance";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function FacultyAttendanceImport({ activityId }: { activityId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [confirmation, setConfirmation] = useState<{ message: string; users: Array<{ mssv: string; fullName: string; classLabel: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Nhập danh sách tham gia và cộng điểm</h2>
      <p className="mt-1 text-sm text-slate-500">File cần có cột MSSV. Hệ thống sẽ ghi nhận tham dự, cộng điểm và cập nhật tiêu chí tự động.</p>
      <ActionFeedback pending={pending} message={error} ok={false} />
      {confirmation ? <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0" size={19}/><div className="min-w-0"><p className="font-semibold">Cần xác nhận sinh viên chưa đăng ký</p><p className="mt-1">{confirmation.message}</p><div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-amber-200 bg-white/70"><ul className="divide-y divide-amber-100">{confirmation.users.map((user)=><li key={user.mssv} className="px-3 py-2"><span className="font-medium">{user.fullName}</span> · {user.mssv} · {user.classLabel}</li>)}</ul></div><button type="button" disabled={pending} onClick={()=>{if(confirmInputRef.current)confirmInputRef.current.value="1";formRef.current?.requestSubmit();}} className="mt-3 rounded-xl border border-amber-700 bg-white px-4 py-2 font-semibold text-amber-800">Tôi xác nhận các sinh viên trên đã đăng ký và tham gia</button></div></div></div> : null}
      <form ref={formRef} className="mt-5 grid gap-4 lg:grid-cols-[minmax(280px,1.2fr)_180px_minmax(260px,1fr)_auto]" onSubmit={(event) => {
        event.preventDefault(); setError("");
        if (!fileInputRef.current?.files?.length) { setError("Vui lòng chọn tệp Excel hoặc CSV cần nhập."); fileInputRef.current?.focus(); return; }
        const form = event.currentTarget; const formData = new FormData(form);
        startTransition(async () => { try { const result = await importFacultyAttendance(activityId, formData); if(result.requiresConfirmation){setConfirmation({message:result.message,users:result.unregistered});toast.error("Danh sách có sinh viên chưa đăng ký. Vui lòng kiểm tra và xác nhận.");return;} toast.success(result.message, { id: `activity-import-${activityId}` }); form.reset(); setFileName(""); setConfirmation(null); } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể nhập danh sách."); } });
      }}>
        <input ref={confirmInputRef} type="hidden" name="confirmUnregistered" defaultValue="0"/>
        <div className="flex min-w-0 items-stretch overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex shrink-0 items-center gap-2 border-r border-blue-700 bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800">
            <FileUp size={16}/><span>Chọn tệp</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-sm">
            <FileSpreadsheet size={17} className={fileName ? "shrink-0 text-emerald-600" : "shrink-0 text-slate-400"}/>
            <div className="min-w-0"><div className={`truncate ${fileName ? "font-medium text-slate-800" : "text-slate-500"}`}>{fileName || "Chưa chọn tệp"}</div><div className="text-[11px] text-slate-400">XLSX, XLS hoặc CSV</div></div>
          </div>
          <input ref={fileInputRef} name="file" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => {setFileName(event.target.files?.[0]?.name ?? "");setConfirmation(null);if(confirmInputRef.current)confirmInputRef.current.value="0";}}/>
        </div>
        <select name="mode" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="append">Nhập bổ sung</option><option value="replace">Thay thế danh sách</option>
        </select>
        <input name="reason" required minLength={10} placeholder="Lý do nhập/thay thế dữ liệu..." className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
        <button disabled={pending} className="h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Đang nhập..." : "Nhập Excel"}</button>
      </form>
    </section>
  );
}
