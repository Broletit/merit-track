"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateEvent } from "@/server/actions/events/updateEvent";
import type { AdminCriteriaTemplateOption } from "./types";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import ActionFeedback from "@/components/shared/ActionFeedback";

type State = {
  ok: boolean;
  message: string;
  revision: number;
  field?: "title" | "type" | "startAt" | "endAt" | "templateId" | "status";
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
      allowLate: formData.get("allowLate") === "on",
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
  const selectedType = String(state.values?.type ?? event.type);

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
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
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
          </>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên đợt xét
            </label>
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
            </label>
            <select
              name="type"
              defaultValue={selectedType}
              aria-invalid={state.field === "type"}
              disabled={isInUse}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="student">Sinh viên</option>
              <option value="officer">Cán bộ đoàn</option>
            </select>

            {isInUse ? (
              <p className="mt-2 text-xs text-slate-500">
                Đợt xét đã có hồ sơ nên không thể đổi đối tượng.
              </p>
            ) : null}
          </div>
        </div>

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
            </label>
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

            {isInUse ? (
              <p className="mt-2 text-xs text-slate-500">
                Đợt xét đã có hồ sơ nên không thể đổi thời gian mở nộp.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Thời gian đóng nộp
            </label>
            <input
              type="datetime-local"
              name="endAt"
              min={endMin}
              required
              defaultValue={String(state.values?.endAt ?? defaultEndAt)}
              aria-invalid={state.field === "endAt"}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 ${state.field === "endAt" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            />

            {isInUse ? (
              <p className="mt-2 text-xs text-slate-500">
                Có thể kéo dài thời gian đóng nộp khi đợt xét đang được sử dụng.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Mẫu tiêu chuẩn
            </label>
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
                    {item.name} - {item.forType}
                  </option>
                ))}
            </select>

            {isInUse ? (
              <p className="mt-2 text-xs text-slate-500">
                Đợt xét đã có hồ sơ nên không thể đổi mẫu tiêu chuẩn.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Trạng thái
            </label>
            <select
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
            <div className="mt-2">
              <EventSubmissionPhaseBadge
                event={{
                  status: event.status,
                  startAt: event.startAt,
                  endAt: event.endAt,
                  allowLate: event.allowLate,
                }}
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-100">
          <input
            type="checkbox"
            name="allowLate"
            defaultChecked={Boolean(state.values?.allowLate ?? event.allowLate)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-semibold">Cho phép nộp trễ</span>
            <span className="mt-1 block text-slate-500">
              Người dùng vẫn có thể tạo/hoàn thiện hồ sơ sau thời gian đóng nộp.
            </span>
          </span>
        </label>

        {isInUse ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
            Đợt xét đang được sử dụng nên chỉ có thể sửa tên, mô tả, kéo dài thời gian đóng
            và thay đổi quy định nộp trễ. Đối tượng, bộ tiêu chuẩn, thời gian mở và trạng thái
            cấu hình được giữ nguyên để bảo toàn kết quả.
          </div>
        ) : null}

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
  if (message.includes("thời gian mở")) return "startAt";
  if (message.includes("thời gian đóng") || message.includes("sau thời gian mở")) return "endAt";
  if (message.includes("thời gian")) return "startAt";
  return undefined;
}
