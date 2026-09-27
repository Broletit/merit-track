import { redirect } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { getSessionUser } from "@/server/auth/getSessionUser";
import { getDefaultRouteByRoleContext } from "@/server/auth/role-context";

import LoginForm from "./LoginForm";

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

        <div className="flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="rounded-4xl bg-white/95 p-2 shadow-[0_32px_90px_rgba(0,0,0,0.38)] ring-1 ring-white/40 backdrop-blur">
              <div className="rounded-[1.7rem] bg-white px-8 py-9">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    Đăng nhập hệ thống
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Sử dụng MSSV hoặc email được cấp để truy cập tài khoản.
                  </p>
                </div>

                <div className="mt-8">
                  <LoginForm />
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-100">
                  Một tài khoản duy nhất cho sinh viên và cán bộ với khả năng
                  chuyển đổi giao diện linh hoạt.
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
