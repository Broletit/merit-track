"use client";

import { useActionState } from "react";
import { createAcademicTerm } from "@/server/actions/academic-terms/createAcademicTerm";
import ActionFeedback from "@/components/shared/ActionFeedback";

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  message: "",
};

async function action(_prev: State, formData: FormData): Promise<State> {
  try {
    const result = await createAcademicTerm(formData);
    return { ok: true, message: result.message };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Tạo học kỳ thất bại.",
    };
  }
}

export default function AcademicTermCreateForm() {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Thêm học kỳ</h2>

      <form action={formAction} className="mt-5 space-y-4">
        <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Năm học
            </label>
            <input
              name="academicYear"
              required
              placeholder="2025-2026"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Học kỳ
            </label>
            <input
              name="semester"
              required
              placeholder="HK1 / HK2"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên hiển thị
            </label>
            <input
              name="name"
              required
              placeholder="Học kỳ 1 năm học 2025-2026"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Ngày bắt đầu
            </label>
            <input
              type="datetime-local"
              name="startAt"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Ngày kết thúc
            </label>
            <input
              type="datetime-local"
              name="endAt"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              disabled={pending}
              className="h-11 w-full rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {pending ? "Đang tạo..." : "Thêm học kỳ"}
            </button>
          </div>
        </div>
      </form>

    </section>
  );
}
