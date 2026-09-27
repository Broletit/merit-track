"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserAdmin } from "@/server/actions/admin/users/updateUserAdmin";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function UserAccountAdminForm({
  userId,
  currentRole,
  currentActive,
}: {
  userId: number;
  currentRole: string;
  currentActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  function submit(formData: FormData) {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await updateUserAdmin(userId, formData);
        setOk(true);
        setMessage(result.message || "Đã cập nhật tài khoản.");
        router.refresh();
        window.setTimeout(() => document.getElementById("user-information")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      } catch (error) {
        setOk(false);
        setMessage(
          error instanceof Error ? error.message : "Cập nhật tài khoản thất bại."
        );
      }
    });
  }

  return (
    <section className="h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <h2 className="text-xl font-semibold text-slate-900">
        Quyền và trạng thái tài khoản
      </h2>

      <form key={`${currentRole}-${currentActive}`} action={submit} className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Vai trò
          </label>
          <select
            name="role"
            defaultValue={currentRole}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="student">Sinh viên</option>
            <option value="class_officer">Cán bộ lớp</option>
            <option value="faculty_officer">Cán bộ khoa</option>
          </select>
        </div>
        <div><label className="mb-2 block text-sm font-medium text-slate-600">Lý do thay đổi</label><textarea name="reason" required minLength={10} rows={3} placeholder="Ghi rõ lý do đổi vai trò hoặc trạng thái..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Trạng thái
          </label>
          <select
            name="isActive"
            defaultValue={currentActive ? "1" : "0"}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="1">Đang hoạt động</option>
            <option value="0">Vô hiệu hóa</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>

    </section>
  );
}
