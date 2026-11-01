"use client";
import RequiredMark from "@/components/common/RequiredMark";


import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateEvent } from "@/server/actions/events/updateEvent";
import type { AdminCriteriaTemplateOption } from "./types";
import ActionFeedback from "@/components/shared/ActionFeedback";

type State = {
  ok: boolean;
  message: string;
  revision: number;
  field?: "title" | "type" | "startAt" | "endAt" | "templateId" | "status" | "scoreMax";
  values?: Record<string, string | boolean>;
};

type EventValue = {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  allowLate: boolean;
  criteriaTemplateId: number | null;
  submissions: number;
  scoreMax: number | null;
};

const initialState: State = {
  ok: false,
  message: "",
  revision: 0,
};

function toInputDateTime(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

export default function EventEditForm({
  event,
  templates,
}: {
  event: EventValue;
  templates: AdminCriteriaTemplateOption[];
}) {
  const isInUse = Number(event.submissions ?? 0) > 0 || event.status !== "draft";
  const router = useRouter();

  const nowForInput = toInputDateTime(new Date().toISOString());
  const defaultStartAt = toInputDateTime(event.startAt);
  const defaultEndAt = toInputDateTime(event.endAt);

  const startMin =
    defaultStartAt && defaultStartAt < nowForInput
      ? defaultStartAt
      : nowForInput;

  const endMin =
    defaultEndAt && defaultEndAt < nowForInput ? defaultEndAt : nowForInput;

  async function action(prev: State, formData: FormData): Promise<State> {
    const values = {
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? event.type),
      description: String(formData.get("description") ?? ""),
      startAt: String(formData.get("startAt") ?? defaultStartAt),
      endAt: String(formData.get("endAt") ?? ""),
      templateId: String(formData.get("templateId") ?? event.criteriaTemplateId ?? ""),
      status: String(formData.get("status") ?? event.status),
      scoreMax: String(formData.get("scoreMax") ?? event.scoreMax ?? ""),
    };

    try {
      const result = await updateEvent(event.id, formData);

      return {
        ok: true,
        message: result.message || "Cập nhật đợt xét thành công.",
        revision: prev.revision + 1,
        values,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Cập nhật đợt xét thất bại.",
        revision: prev.revision + 1,
        field: getErrorField(error),
        values,
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedType, setSelectedType] = useState(String(event.type));

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
    toast.success(state.message, { id: `event-update-${event.id}` });
    router.push("/dashboard/admin/events");
    router.refresh();
  }, [event.id, router, state.message, state.ok]);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <form key={state.revision} ref={formRef} action={formAction} className="space-y-5">
        <ActionFeedback pending={pending} message={state.ok ? "" : state.message} ok={false} />
        {isInUse ? (
          <>
            <input type="hidden" name="type" value={event.type} />
            <input type="hidden" name="startAt" value={defaultStartAt} />
            <input
              type="hidden"
              name="templateId"
              value={event.criteriaTemplateId ?? ""}
            />
            <input type="hidden" name="status" value={event.status} />
            <input type="hidden" name="scoreMax" value={event.scoreMax ?? ""} />
          </>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên đợt xét
            <RequiredMark required={true}/></label>
            <input
              name="title"
              required
              defaultValue={String(state.values?.title ?? event.title)}
              aria-invalid={state.field === "title"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "title" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Đối tượng
            <RequiredMark/></label>
            <select required
              name="type"
              defaultValue={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              aria-invalid={state.field === "type"}
              disabled={isInUse}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="student">Sinh viên</option>
              <option value="officer">Cán bộ</option>
            </select>
          </div>
        </div>

        {selectedType === "officer" && !isInUse ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Điểm tối đa<RequiredMark required={true}/></label>
            <input name="scoreMax" type="number" min="0.5" step="0.5" required defaultValue={String(state.values?.scoreMax ?? event.scoreMax ?? 100)} aria-invalid={state.field === "scoreMax"} className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "scoreMax" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`} />
          </div>
        ) : selectedType !== "officer" && !isInUse ? <input type="hidden" name="scoreMax" value="0" /> : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={String(state.values?.description ?? event.description)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
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
              min={startMin}
              required
              defaultValue={String(state.values?.startAt ?? defaultStartAt)}
              aria-invalid={state.field === "startAt"}
              disabled={isInUse}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${state.field === "startAt" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Thời gian đóng nộp
            <RequiredMark required={true}/></label>
            <input
              type="datetime-local"
              name="endAt"
              min={endMin}
              required
              defaultValue={String(state.values?.endAt ?? defaultEndAt)}
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
              disabled={isInUse}
              defaultValue={String(state.values?.templateId ?? event.criteriaTemplateId ?? "")}
              aria-invalid={state.field === "templateId"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${state.field === "templateId" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            >
              <option value="">Chọn mẫu tiêu chuẩn</option>
              {templates
                .filter((item) => item.forType === selectedType)
                .map((item) => (
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
              disabled={isInUse}
              defaultValue={String(state.values?.status ?? event.status)}
              aria-invalid={state.field === "status"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${state.field === "status" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            >
              <option value="draft">Nháp</option>
              <option value="published">Công khai</option>
              <option value="closed">Đóng</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            disabled={pending || state.ok}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending || state.ok ? "Đang chuyển đến danh sách..." : "Lưu thay đổi"}
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
