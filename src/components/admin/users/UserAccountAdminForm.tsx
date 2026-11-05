"use client";

import RequiredMark from "@/components/common/RequiredMark";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserAdmin } from "@/server/actions/admin/users/updateUserAdmin";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function UserAccountAdminForm({ userId, currentRoles, currentActive }: { userId: number; currentRoles: string[]; currentActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const initialOfficers = currentRoles.filter((role) => role === "class_officer" || role === "faculty_officer");
  const [officerRoles, setOfficerRoles] = useState<string[]>(initialOfficers);
  const [selectedActive, setSelectedActive] = useState(currentActive ? "1" : "0");
  const isOfficer = officerRoles.length > 0;
  const changed = [...officerRoles].sort().join(",") !== [...initialOfficers].sort().join(",") || selectedActive !== (currentActive ? "1" : "0");

  function toggle(role: string) { setOfficerRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]); }
  function submit(formData: FormData) {
    if (!changed) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updateUserAdmin(userId, formData);
        setOk(true); setMessage(result.message || "Đã cập nhật tài khoản."); router.refresh();
      } catch (error) { setOk(false); setMessage(error instanceof Error ? error.message : "Cập nhật tài khoản thất bại."); }
    });
  }

  return <section className="flex h-full min-w-0 flex-col rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 shadow-slate-200/60 sm:p-6">
    <ActionFeedback pending={pending} message={message} ok={ok} />
    <h2 className="text-xl font-semibold text-slate-900">Quyền và trạng thái</h2>
    <form action={submit} className="mt-5 grid flex-1 content-start items-start grid-cols-2 gap-4">
      <div className="min-w-0"><label className="mb-2 block text-sm font-medium text-slate-600">Vai trò<RequiredMark required /></label><select value={isOfficer ? "officer" : "student"} onChange={(event) => { if (event.target.value === "student") setOfficerRoles([]); else if (!officerRoles.length) setOfficerRoles(["class_officer"]); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"><option value="student">Sinh viên</option><option value="officer">Cán bộ</option></select></div>
      <div className="min-w-0"><label className="mb-2 block text-sm font-medium text-slate-600">Trạng thái<RequiredMark required /></label><select name="isActive" value={selectedActive} onChange={(event) => setSelectedActive(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"><option value="1">Đang hoạt động</option><option value="0">Vô hiệu hóa</option></select></div>
      {isOfficer ? <fieldset className="col-span-2 min-w-0"><legend className="mb-2 text-sm font-medium text-slate-600">Phân quyền cán bộ</legend><div className="grid gap-3 sm:grid-cols-2">{[["class_officer","Cán bộ lớp"],["faculty_officer","Cán bộ khoa"]].map(([role,label]) => <label key={role} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"><input type="checkbox" name="officerRoles" value={role} checked={officerRoles.includes(role)} onChange={() => toggle(role)} />{label}</label>)}</div></fieldset> : null}
      <div className="col-span-2 min-w-0"><label className="mb-2 block text-sm font-medium text-slate-600">Lý do thay đổi<RequiredMark required /></label><textarea name="reason" required minLength={10} rows={3} placeholder="Ghi rõ lý do thay đổi quyền hoặc trạng thái..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>
      <button type="submit" disabled={pending || !changed} className="col-span-2 self-end justify-self-end rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Đang lưu..." : "Lưu thay đổi"}</button>
    </form>
  </section>;
}
