"use client";
import RequiredMark from "@/components/common/RequiredMark";


import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserClass } from "@/server/actions/admin/users/updateUserClass";
import ActionFeedback from "@/components/shared/ActionFeedback";

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export default function UserClassAdminForm({
  userId,
  classes,
  currentClassId,
}: {
  userId: number;
  classes: ClassOption[];
  currentClassId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(String(currentClassId ?? ""));
  const changed = selectedClassId !== "" && selectedClassId !== String(currentClassId ?? "");

  function submit(formData: FormData) {
    if (!changed) return;
    setMessage("");

    startTransition(async () => {
      try {
        const result = await updateUserClass(userId, formData);
        setOk(true);
        setMessage(result.message || "Đã cập nhật lớp.");
        router.refresh();
        window.setTimeout(() => document.getElementById("user-information")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      } catch (error) {
        setOk(false);
        setMessage(error instanceof Error ? error.message : "Cập nhật lớp thất bại.");
      }
    });
  }

  return (
    <section className="flex h-full min-w-0 flex-col rounded-3xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <h2 className="text-xl font-semibold text-slate-900">
        Lớp sinh hoạt
      </h2>

      <form key={currentClassId ?? "none"} action={submit} className="mt-5 flex flex-1 flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Lớp
          <RequiredMark required={true}/></label>
          <select
            name="classId"
            required
            disabled={pending || classes.length===0}
            value={selectedClassId}
            onChange={event => setSelectedClassId(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="">Chọn lớp</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            ))}
          </select>
          {classes.length===0&&<p className="mt-2 text-sm text-amber-700">Chưa có lớp phù hợp với khóa của người dùng.</p>}
        </div>
        <div><label className="mb-2 block text-sm font-medium text-slate-600">Lý do chuyển lớp<RequiredMark required={true}/></label><textarea name="reason" required minLength={10} rows={3} placeholder="Ghi rõ lý do để lưu lịch sử..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>

        <div className="mt-auto flex justify-end">
          <button
            type="submit"
            disabled={pending || !changed}
            title={!changed ? "Chọn lớp khác lớp hiện tại để cập nhật" : undefined}
            className="min-h-11 h-auto min-w-44 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60 py-2 max-w-full break-words"
          >
            {pending ? "Đang lưu..." : "Cập nhật lớp"}
          </button>
        </div>
      </form>

    </section>
  );
}
