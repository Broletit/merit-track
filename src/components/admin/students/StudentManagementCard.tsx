"use client";

import { useActionState } from "react";
import { resetStudentPassword, transferStudentClass } from "@/server/actions/students/manageStudent";
import type { AdminClassOption, StudentDetailSummary } from "./types";
import ActionFeedback from "@/components/shared/ActionFeedback";

type ActionState = {
  ok: boolean;
  message: string;
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

async function transferAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const studentId = Number(formData.get("studentId"));
    const targetClassId = Number(formData.get("targetClassId"));

    await transferStudentClass(studentId, targetClassId);

    return {
      ok: true,
      message: "Chuyển lớp thành công.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Chuyển lớp thất bại.",
    };
  }
}

async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const studentId = Number(formData.get("studentId"));
    await resetStudentPassword(studentId);

    return {
      ok: true,
      message: "Đã đặt lại mật khẩu mặc định là 1111.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại.",
    };
  }
}

export default function StudentManagementCard({
  student,
  classes,
}: {
  student: StudentDetailSummary;
  classes: AdminClassOption[];
}) {
  const [transferState, transferFormAction, transferPending] = useActionState(
    transferAction,
    initialState
  );

  const [resetState, resetFormAction, resetPending] = useActionState(
    resetPasswordAction,
    initialState
  );

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={transferPending} message={transferState.message} ok={transferState.ok} />
      <ActionFeedback pending={resetPending} message={resetState.message} ok={resetState.ok} />
      <h2 className="text-xl font-semibold text-slate-900">Quản lý sinh viên</h2>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form action={transferFormAction} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Chuyển lớp thủ công</h3>
          <p className="mt-2 text-sm text-slate-500">
            Dùng khi sinh viên chuyển lớp hoặc chuyển ngành chính thức.
          </p>

          <input type="hidden" name="studentId" value={student.id} />

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Lớp mới
            </label>
            <select
              name="targetClassId"
              defaultValue={String(student.class_id)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={transferPending}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {transferPending ? "Đang chuyển..." : "Chuyển lớp"}
            </button>
          </div>

        </form>

        <form action={resetFormAction} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Đặt lại mật khẩu</h3>
          <p className="mt-2 text-sm text-slate-500">
            Sau khi reset, sinh viên sẽ dùng mật khẩu mặc định <span className="font-semibold">1111</span> và phải đổi lại khi đăng nhập.
          </p>

          <input type="hidden" name="studentId" value={student.id} />

          <div className="mt-4">
            <button
              type="submit"
              disabled={resetPending}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {resetPending ? "Đang xử lý..." : "Reset mật khẩu"}
            </button>
          </div>

        </form>
      </div>
    </section>
  );
}
