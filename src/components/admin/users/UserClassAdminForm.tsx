"use client";

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

  function submit(formData: FormData) {
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
    <section className="h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <h2 className="text-xl font-semibold text-slate-900">
        Lớp sinh hoạt
      </h2>

      <form key={currentClassId ?? "none"} action={submit} className="mt-5 flex h-[calc(100%-3rem)] flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Lớp
          </label>
          <select
            name="classId"
            required
            defaultValue={currentClassId ?? ""}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="">Chọn lớp</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name}
              </option>
            ))}
          </select>
        </div>
        <div><label className="mb-2 block text-sm font-medium text-slate-600">Lý do chuyển lớp</label><textarea name="reason" required minLength={10} rows={3} placeholder="Ghi rõ lý do để lưu lịch sử..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>

        <div className="mt-auto flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="h-11 min-w-44 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Đang lưu..." : "Cập nhật lớp"}
          </button>
        </div>
      </form>

    </section>
  );
}
