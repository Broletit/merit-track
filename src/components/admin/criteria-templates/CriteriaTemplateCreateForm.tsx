"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { createCriteriaTemplate } from "@/server/actions/criteria-templates/createCriteriaTemplate";
import ActionFeedback from "@/components/shared/ActionFeedback";

type State = {
  ok: boolean;
  message: string;
  templateId: number | null;
};

const initialState: State = {
  ok: false,
  message: "",
  templateId: null,
};

async function action(_prev: State, formData: FormData): Promise<State> {
  try {
    const result = await createCriteriaTemplate(formData);

    return {
      ok: true,
      message: result.message,
      templateId: result.templateId,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Tạo bộ tiêu chuẩn thất bại.",
      templateId: null,
    };
  }
}

export default function CriteriaTemplateCreateForm() {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <form action={formAction} className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">
          Thông tin bộ tiêu chuẩn
        </h2>


        <div className="mt-5 grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên bộ tiêu chuẩn
            </label>
            <input
              name="name"
              required
              placeholder="Ví dụ: Bộ tiêu chuẩn Sinh viên 5 tốt"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Đối tượng
            </label>
            <select
              name="forType"
              required
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
            >
              <option value="student">Sinh viên </option>
              <option value="officer">Cán bộ </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Mô tả
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Mô tả mục đích, phạm vi áp dụng của bộ tiêu chuẩn"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {pending ? "Đang tạo..." : "Tạo bộ tiêu chuẩn"}
        </button>
      </div>

      {state.ok && state.templateId ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div>
              <Link
                href={`/dashboard/admin/criteria-templates/${state.templateId}/configure`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Đi tới cấu hình tiêu chuẩn / tiêu chí
                <ArrowRight size={16} />
              </Link>
          </div>
        </section>
      ) : null}
    </form>
    </>
  );
}
