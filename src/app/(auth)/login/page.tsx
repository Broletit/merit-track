import { redirect } from "next/navigation";
import Image from "next/image";
import { LogIn, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { getSessionUser } from "@/server/auth/getSessionUser";
import { getDefaultRouteByRoleContext } from "@/server/auth/role-context";

import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect(getDefaultRouteByRoleContext(user.loginContext as never));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.22),transparent_35%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size opacity-20" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-14 px-6 py-10 lg:grid-cols-2 lg:px-10">
        <div className="flex flex-col justify-center text-white">
          <div className="w-fit">
            <Image
              src="/Logo.png"
              alt="Logo Khoa Công nghệ Điện tử"
              width={929}
              height={959}
              className="h-20 w-20 object-contain sm:hidden"
              priority
            />
            <Image
              src="/fullLogo.png"
              alt="Khoa Công nghệ Điện tử"
              width={4111}
              height={1019}
              className="hidden h-20 w-auto max-w-full object-contain object-left sm:block"
              priority
            />
          </div>

          <h3 className="mt-8 max-w-4xl text-3xl font-bold leading-[1.55] tracking-tight text-white xl:text-4xl">
            HỆ THỐNG QUẢN LÝ ĐOÀN VIÊN & XÉT THI ĐUA - KHEN THƯỞNG
          </h3>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Feature
              icon={<ShieldCheck size={20} />}
              title="Minh bạch"
              description="Rõ ràng trong từng quy trình xét duyệt."
            />

            <Feature
              icon={<Sparkles size={20} />}
              title="Tinh gọn"
              description="Tối ưu thao tác - thời gian cho Cán bộ Đoàn."
            />

            <Feature
              icon={<UsersRound size={20} />}
              title="Kết nối"
              description="Đồng hành cùng sinh viên trên một nền tảng."
            />
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div aria-hidden="true" className={styles.halo} />
          <div className={`relative w-full max-w-md ${styles.appear}`}>
            <div className={styles.frame}>
              <div className="relative overflow-hidden rounded-[1.9rem] bg-white px-6 py-8 sm:px-9 sm:py-10">
                <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-amber-300 to-transparent" />
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-linear-to-br from-blue-700 to-blue-950 text-white shadow-lg shadow-blue-900/25 ring-4 ring-blue-50"><LogIn size={28} aria-hidden="true" /><span aria-hidden="true" className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-white bg-amber-300 text-blue-950"><Sparkles size={12} /></span></span>
                  <h2 className="text-[1.75rem] font-bold tracking-tight text-blue-950">Đăng nhập</h2>
                  <span aria-hidden="true" className="-mt-2 h-1 w-10 rounded-full bg-amber-300" />
                </div>

                <div className="mt-6">
                  <LoginForm />
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur transition duration-300 hover:bg-white/15">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-50">
        {icon}
      </div>

      <div className="text-sm font-semibold text-white">{title}</div>

      <p className="mt-2 text-xs leading-5 text-slate-300">{description}</p>
    </div>
  );
}
