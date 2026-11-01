"use client";
import RequiredMark from "@/components/common/RequiredMark";


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
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedActive, setSelectedActive] = useState(currentActive ? "1" : "0");
  const changed = selectedRole !== currentRole || selectedActive !== (currentActive ? "1" : "0");

  function submit(formData: FormData) {
    if (!changed) return;
    setMessage("");

    startTransition(async () => {
      try {
        const result = await updateUserAdmin(userId, formData);
        setOk(true);
        setMessage(result.message || "Đã cập nhật tài khoản.");
        router.refresh();
        window.setTimeout(() => document.getElementById("user-information")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      } catch (error) {
        setSelectedRole(currentRole);
        setSelectedActive(currentActive ? "1" : "0");
        setOk(false);
        setMessage(
          error instanceof Error ? error.message : "Cập nhật tài khoản thất bại."
        );
      }
    });
  }

  return (
    <section className="flex h-full min-w-0 flex-col rounded-3xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <h2 className="text-xl font-semibold text-slate-900">
        Quyền và trạng thái
      </h2>

      <form key={`${currentRole}-${currentActive}`} action={submit} className="mt-5 grid flex-1 content-start items-start grid-cols-2 gap-4">
        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Vai trò
          <RequiredMark required={true}/></label>
          <select
            name="role"
            required
            value={selectedRole}
            onChange={event => setSelectedRole(event.target.value)}
            className="h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="student">Sinh viên</option>
            <option value="class_officer">Cán bộ lớp</option>
            <option value="faculty_officer">Cán bộ khoa</option>
          </select>
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Trạng thái
          <RequiredMark required={true}/></label>
          <select
            name="isActive"
            required
            value={selectedActive}
            onChange={event => setSelectedActive(event.target.value)}
            className="h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="1">Đang hoạt động</option>
            <option value="0">Vô hiệu hóa</option>
          </select>
        </div>

        <div className="col-span-2 min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-600">Lý do thay đổi<RequiredMark required={true}/></label>
          <textarea name="reason" required minLength={10} rows={3} placeholder="Ghi rõ lý do đổi vai trò hoặc trạng thái..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        </div>

        <button
          type="submit"
          disabled={pending || !changed}
          title={!changed ? "Thay đổi vai trò hoặc trạng thái để lưu" : undefined}
          className="col-span-2 self-end justify-self-end rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>

    </section>
  );
}
