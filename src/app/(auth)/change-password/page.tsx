import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/getSessionUser";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
        <ChangePasswordForm />
      </section>
    </main>
  );
}