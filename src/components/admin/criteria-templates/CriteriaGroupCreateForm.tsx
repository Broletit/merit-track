"use client";

import { useActionState } from "react";
import { createCriteriaGroup } from "@/server/actions/criteria-templates/createCriteriaGroup";
import { updateCriteriaGroup } from "@/server/actions/criteria-templates/updateCriteriaGroup";
import ActionFeedback from "@/components/shared/ActionFeedback";
import type { CriteriaTemplateGroupItem } from "./types";

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  message: "",
};

export default function CriteriaGroupCreateForm({
  templateId,
  editingGroup,
  onCancelEdit,
  onSaved,
}: {
  templateId: number;
  editingGroup?: CriteriaTemplateGroupItem | null;
  onCancelEdit?: () => void;
  onSaved?: () => void;
}) {
  const isEditing = Boolean(editingGroup);

  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = editingGroup
        ? await updateCriteriaGroup(templateId, editingGroup.code, formData)
        : await createCriteriaGroup(templateId, formData);

      onSaved?.();

      return { ok: true, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Lưu tiêu chuẩn thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <section
      className={`rounded-3xl p-6 shadow-sm ring-1 ${
        isEditing ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-100"
      }`}
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {isEditing ? `Sửa tiêu chuẩn ${editingGroup?.code}` : "Thêm tiêu chuẩn"}
        </h2>
      </div>

      <form key={editingGroup?.code ?? "create"} action={formAction} className="mt-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên tiêu chuẩn
            </label>
            <input
              name="title"
              required
              defaultValue={editingGroup?.title ?? ""}
              placeholder="Ví dụ: Đạo đức - Tình nguyện"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Số tiêu chí tối thiểu cần đạt
            </label>
            <input
              name="minRequired"
              type="number"
              min={0}
              defaultValue={editingGroup?.minRequired ?? 1}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-3">
            {isEditing ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="h-11 flex-1 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {pending
                ? isEditing
                  ? "Đang lưu..."
                  : "Đang thêm..."
                : isEditing
                ? "Lưu thay đổi"
                : "Thêm tiêu chuẩn"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả tiêu chuẩn
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={editingGroup?.description ?? ""}
            placeholder="Mô tả ngắn nhóm tiêu chuẩn này"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>
      </form>

    </section>
    </>
  );
}
