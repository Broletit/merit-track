"use client";

import { useState, useTransition } from "react";
import { Eye, LockKeyhole, RotateCcw, UnlockKeyhole } from "lucide-react";
import toast from "react-hot-toast";
import { updateActivityStatus } from "@/server/actions/activities/updateActivityStatus";
import { updateActivityRegistrationLock } from "@/server/actions/activities/updateActivityRegistrationLock";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function ActivityStatusActions({
  activityId,
  status,
  registrationCount,
  registrationLocked,
}: {
  activityId: number;
  status: string;
  registrationCount: number;
  registrationLocked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  function submit(nextStatus: "draft" | "published") {
    startTransition(async () => {
      try {
        const result = await updateActivityStatus(activityId, nextStatus);
        setFeedback({ message: result.message, ok: true }); toast.success(result.message);
      } catch (error) {
        setFeedback({
          message: error instanceof Error ? error.message : "Cập nhật trạng thái hoạt động thất bại.",
          ok: false,
        });
      }
    });
  }

  function toggleRegistration() { startTransition(async()=>{try{const result=await updateActivityRegistrationLock(activityId,!registrationLocked);setFeedback({message:result.message,ok:true});toast.success(result.message);}catch(error){const message=error instanceof Error?error.message:"Không thể cập nhật đăng ký.";setFeedback({message,ok:false});toast.error(message);}}); }

  return (
    <div className="flex flex-wrap gap-2">
      <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
      {status === "draft" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("published")}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          <Eye size={16} />
          Công khai
        </button>
      ) : null}

      {status === "published" ? (
        <button
          type="button"
          disabled={pending || registrationCount > 0}
          title={registrationCount > 0 ? "Hoạt động đã có sinh viên đăng ký nên không thể đưa về nháp." : "Đưa hoạt động về nháp để ẩn khỏi sinh viên và chỉnh sửa toàn bộ thông tin."}
          onClick={() => submit("draft")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw size={16} />
          Về nháp
        </button>
      ) : null}

      {status === "published" ? <button type="button" disabled={pending} onClick={toggleRegistration} className={`inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${registrationLocked?"border-emerald-300 text-emerald-700 hover:bg-emerald-50":"border-rose-300 text-rose-700 hover:bg-rose-50"}`}>{registrationLocked?<><UnlockKeyhole size={16}/>Mở đăng ký</>:<><LockKeyhole size={16}/>Khóa đăng ký</>}</button>:null}
      {status === "published" && registrationCount > 0 ? (
        <p className="basis-full text-xs text-slate-500">
          Không thể đưa về nháp vì hoạt động đã phát sinh đăng ký.
        </p>
      ) : null}
    </div>
  );
}
