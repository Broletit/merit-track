"use client";

import { useActionState } from "react";
import { createCriteriaItem } from "@/server/actions/criteria-templates/createCriteriaItem";
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

export default function CriteriaItemCreateForm({
  templateId,
  templateForType,
  groups,
}: {
  templateId: number;
  templateForType: string;
  groups: CriteriaTemplateGroupItem[];
}) {
  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      if (templateForType === "student") {
        formData.set("scoreMax", "0");
      }

      const result = await createCriteriaItem(templateId, formData);
      return { ok: true, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Thêm tiêu chí thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);
  const isOfficer = templateForType === "officer";

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Thêm tiêu chí</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sinh viên chỉ xét đạt/không đạt. Cán bộ mới có điểm.
      </p>

      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Thuộc tiêu chuẩn
          </label>
          <select
            name="groupCode"
            required
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Chọn tiêu chuẩn</option>
            {groups.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mã tiêu chí
          </label>
          <input
            name="code"
            placeholder="Ví dụ: A1"
            required
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Tên tiêu chí
          </label>
          <input
            name="title"
            placeholder="Ví dụ: Tham gia hoạt động tình nguyện"
            required
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Loại xét tiêu chí
          </label>
          <select
            name="evidenceType"
            defaultValue="manual"
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
          >
            <option value="auto">Tự động từ hoạt động</option>
            <option value="manual">Tự khai minh chứng</option>
            <option value="both">Tự động hoặc nộp minh chứng</option>
          </select>
        </div>

        {isOfficer ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Điểm tối đa
            </label>
            <input
              name="scoreMax"
              type="number"
              min={0}
              defaultValue={0}
              placeholder="Ví dụ: 10"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <input name="scoreMax" type="hidden" value="0" />
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Thứ tự hiển thị
          </label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={0}
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Bắt buộc hay tự chọn
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm text-slate-700">
            <input name="isRequired" type="checkbox" />
            Tiêu chí bắt buộc
          </label>
        </div>

        <div className="md:col-span-4">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả tiêu chí
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Mô tả điều kiện để đạt tiêu chí này"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100 md:col-span-4">
          Với tiêu chí tự động, admin chỉ cần gắn hoạt động phù hợp ở danh sách
          bên dưới. Hệ thống sẽ tự kiểm tra người nộp có tham gia hoạt động đó
          hay không để tự động pass.
        </div>

        <div className="flex justify-end md:col-span-4">
          <button
            disabled={pending}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Đang thêm..." : "Thêm tiêu chí"}
          </button>
        </div>
      </form>

    </section>
    </>
  );
}
