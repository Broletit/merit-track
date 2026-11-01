import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDefaultRouteByRoleContext, type LoginRoleContext } from "@/server/auth/role-context";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/getSessionUser";
import ChangePasswordForm from "./ChangePasswordForm";
import { logoutAction } from "../logout/actions";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
        {Number(user.must_change_pw) === 1 ? <p className="mb-4 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900">Bạn cần đổi mật khẩu tạm trước khi tiếp tục sử dụng hệ thống. Mật khẩu mới cần ít nhất 8 ký tự.</p> : null}
        {Number(user.must_change_pw) === 1 ? <form action={logoutAction} className="mb-5"><button type="submit" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-600" data-back-link><ArrowLeft size={16}/>Quay lại đăng nhập</button></form> : <Link href={getDefaultRouteByRoleContext(user.loginContext as LoginRoleContext)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-600" data-back-link><ArrowLeft size={16} />Quay về</Link>}
        <ChangePasswordForm />
      </section>
    </main>
  );
}
