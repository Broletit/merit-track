import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <main className="flex min-h-[80dvh] items-center justify-center bg-slate-50 px-4 py-10">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-blue-900">Quên mật khẩu</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Xác minh qua Gmail đã đăng ký trong hồ sơ để đặt mật khẩu mới.</p>
      <ForgotPasswordForm />
    </section>
  </main>;
}
