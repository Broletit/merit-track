"use client";
import RequiredMark from "@/components/common/RequiredMark";


import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { createEvent } from "@/server/actions/events/createEvent";
import type { AdminCriteriaTemplateOption } from "./types";

type State = {
  ok: boolean;
  message: string;
  revision: number;
  field?: "title" | "type" | "startAt" | "endAt" | "templateId" | "status" | "scoreMax";
  values?: Record<string, string | boolean>;
};

const initialState: State = {
  ok: false,
  message: "",
  revision: 0,
};

export default function EventCreateForm({
  templates,
}: {
  templates: AdminCriteriaTemplateOption[];
}) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("student");
  const nowForInput = new Date().toISOString().slice(0, 16);

  async function action(prev: State, formData: FormData): Promise<State> {
    const values = {
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "student"),
      description: String(formData.get("description") ?? ""),
      startAt: String(formData.get("startAt") ?? ""),
      endAt: String(formData.get("endAt") ?? ""),
      templateId: String(formData.get("templateId") ?? ""),
      status: String(formData.get("status") ?? "draft"),
      scoreMax: String(formData.get("scoreMax") ?? ""),
    };

    try {
      const result = await createEvent(formData);
      return {
        ok: true,
        message: result.message,
        revision: prev.revision + 1,
        values,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Tạo đợt xét thất bại.",
        revision: prev.revision + 1,
        field: getErrorField(error),
        values,
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok && state.field) {
      const fieldName = state.field;
      requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(fieldName);
        if (field instanceof HTMLElement) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          field.focus({ preventScroll: true });
        }
      });
    }
  }, [state]);

  useEffect(() => {
    if (!state.ok || !state.message) return;
    toast.success(state.message, { id: "event-create-success" });
    router.push("/dashboard/admin/events");
    router.refresh();
  }, [router, state.message, state.ok]);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <form key={state.revision} ref={formRef} action={formAction} className="space-y-5">
        <ActionFeedback pending={pending} message={state.ok ? "" : state.message} ok={false} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên đợt xét
            <RequiredMark required={true}/></label>
            <input
              name="title"
              required
              defaultValue={String(state.values?.title ?? "")}
              aria-invalid={state.field === "title"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "title" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
              placeholder="Ví dụ: Đợt xét Sinh viên 5 tốt cấp khoa"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Đối tượng
            <RequiredMark/></label>
            <select required
              name="type"
              defaultValue={String(state.values?.type ?? "student")}
              onChange={(event) => setSelectedType(event.target.value)}
              aria-invalid={state.field === "type"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "type" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            >
              <option value="student">Sinh viên</option>
              <option value="officer">Cán bộ</option>
            </select>
          </div>
        </div>

        {selectedType === "officer" ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Điểm tối đa<RequiredMark required={true}/></label>
            <input name="scoreMax" type="number" min="0.5" step="0.5" required defaultValue={String(state.values?.scoreMax ?? "100")} aria-invalid={state.field === "scoreMax"} className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "scoreMax" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`} />
          </div>
        ) : <input type="hidden" name="scoreMax" value="0" />}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả
          </label>
          <textarea
            name="description"
            defaultValue={String(state.values?.description ?? "")}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            placeholder="Mô tả ngắn về đợt xét"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Thời gian mở nộp
            <RequiredMark required={true}/></label>
            <input
              type="datetime-local"
              name="startAt"
              min={nowForInput}
              required
              defaultValue={String(state.values?.startAt ?? "")}
              aria-invalid={state.field === "startAt"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "startAt" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Thời gian đóng nộp
            <RequiredMark required={true}/></label>
            <input
              type="datetime-local"
              name="endAt"
              min={nowForInput}
              required
              defaultValue={String(state.values?.endAt ?? "")}
              aria-invalid={state.field === "endAt"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "endAt" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Mẫu tiêu chuẩn
            <RequiredMark required={true}/></label>
            <select
              name="templateId"
              required
              defaultValue={String(state.values?.templateId ?? "")}
              aria-invalid={state.field === "templateId"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "templateId" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            >
              <option value="">Chọn mẫu tiêu chuẩn</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.forType === "student" ? "SV" : "CB"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Trạng thái
            <RequiredMark/></label>
            <select required
              name="status"
              defaultValue={String(state.values?.status ?? "draft")}
              aria-invalid={state.field === "status"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "status" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            >
              <option value="draft">Nháp</option>
              <option value="published">Công khai</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            disabled={pending || state.ok}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending || state.ok ? "Đang chuyển đến danh sách..." : "Tạo đợt xét"}
          </button>
        </div>
      </form>
    </section>
  );
}

function getErrorField(error: unknown): State["field"] {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("tên đợt xét")) return "title";
  if (message.includes("đối tượng")) return "type";
  if (message.includes("mẫu tiêu chuẩn")) return "templateId";
  if (message.includes("trạng thái")) return "status";
  if (message.includes("điểm tối đa")) return "scoreMax";
  if (message.includes("thời gian mở")) return "startAt";
  if (message.includes("thời gian đóng") || message.includes("sau thời gian mở")) return "endAt";
  if (message.includes("thời gian")) return "startAt";
  return undefined;
}
