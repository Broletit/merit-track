"use client";

import { useActionState } from "react";
import { updateCriteriaTemplate } from "@/server/actions/criteria-templates/updateCriteriaTemplate";
import { cloneCriteriaTemplate } from "@/server/actions/criteria-templates/cloneCriteriaTemplate";
import ActionFeedback from "@/components/shared/ActionFeedback";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import type { AdminCriteriaTemplateItem } from "./types";

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  message: "",
};

export default function CriteriaTemplateEditInlineForm({
  item,
  onCancel,
  onSaved,
}: {
  item: AdminCriteriaTemplateItem;
  onCancel: () => void;
  onSaved: () => void;
}) {
  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = formData.get("intent") === "copy" ? await cloneCriteriaTemplate(item.id,formData) : await updateCriteriaTemplate(item.id, formData);
      toast.success(result.message, { id: `criteria-template-update-${item.id}` });
      onSaved();

      return {
        ok: true,
        message: result.message,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Cập nhật bộ tiêu chuẩn thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <section className="mt-5 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Sửa bộ tiêu chuẩn
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Đang sửa: <span className="font-medium">{item.name}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Quay về
        </button>
      </div>

      <form key={item.id} action={formAction} className="mt-4 space-y-4">
        {item.usedEvents > 0 ? (
          <div className="rounded-xl bg-white px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Bộ tiêu chuẩn đang được {item.usedEvents} đợt xét sử dụng nên chỉ được đổi tên và mô tả. Hãy lưu thành bản sao nếu cần thay đổi đối tượng hoặc cấu hình.
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên bộ tiêu chuẩn
            </label>
            <input
              name="name"
              required
              defaultValue={item.name}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Đối tượng
            </label>
            <select
              name="forType"
              defaultValue={item.forType}
              disabled={item.usedEvents > 0}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="student">Sinh viên</option>
              <option value="officer">Cán bộ</option>
            </select>
            {item.usedEvents > 0 ? <input type="hidden" name="forType" value={item.forType} /> : null}
          </div>

          <div className="flex items-end gap-2 md:col-span-4">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              name="intent"
              value="copy"
              disabled={pending}
              className="h-11 rounded-xl border border-blue-600 bg-white px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            >
              Lưu thành bản sao
            </button>

            <button
              type="submit"
              name="intent"
              value="save"
              disabled={pending}
              className="h-11 flex-1 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
            >
              {pending ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={item.description ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </form>

    </section>
    </>
  );
}
