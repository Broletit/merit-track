"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createActivity } from "@/server/actions/activities/createActivity";
import ActionFeedback from "@/components/shared/ActionFeedback";
import ActivityBasicInfoForm from "./ActivityBasicInfoForm";
import ActivityAudienceForm from "./ActivityAudienceForm";
import ActivityConductForm from "./ActivityConductForm";
import ActivityScheduleForm from "./ActivityScheduleForm";
import ActivitySettingsForm from "./ActivitySettingsForm";
import ActivityOrganizationForm from "./ActivityOrganizationForm";
import type {
  ActivityClassOption,
  ActivityCreateState,
  ActivityCriteriaOption,
  ConductCategoryOption,
} from "./types";

const initialState: ActivityCreateState = {
  ok: false,
  message: "",
  revision: 0,
};

async function createActivityAction(
  prevState: ActivityCreateState,
  formData: FormData
): Promise<ActivityCreateState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    audienceType: String(formData.get("audienceType") ?? "student"),
    status: String(formData.get("status") ?? "draft"),
    conductScore: String(formData.get("conductScore") ?? "0"),
    qrCheckinEnabled: formData.get("qrCheckinEnabled") === "on",
    registrationStartAt: String(formData.get("registrationStartAt") ?? ""),
    registrationEndAt: String(formData.get("registrationEndAt") ?? ""),
    startAt: String(formData.get("startAt") ?? ""),
    endAt: String(formData.get("endAt") ?? ""),
    scopeMode: String(formData.get("scopeMode") ?? "all"),
    classIds: formData.getAll("classIds").map(String),
    organizerLevel: String(formData.get("organizerLevel") ?? "class"),
    participationSource: String(formData.get("participationSource") ?? "internal"),
    conductCategoryId: String(formData.get("conductCategoryId") ?? ""),
  };

  try {
    const result = await createActivity(formData);
    return {
      ok: true,
      message: result.message,
      revision: (prevState.revision ?? 0) + 1,
      values,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Tạo hoạt động thất bại.",
      revision: (prevState.revision ?? 0) + 1,
      field: getActivityErrorField(error),
      values,
    };
  }
}

export default function ActivityCreateForm({
  classes,
  categories,
}: {
  classes: ActivityClassOption[];
  criteriaOptions: ActivityCriteriaOption[];
  categories: ConductCategoryOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createActivityAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok || !state.field) return;
    const fieldName = state.field;
    requestAnimationFrame(() => {
      const field = formRef.current?.elements.namedItem(fieldName);
      const target = field instanceof RadioNodeList ? field[0] : field;
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      }
    });
  }, [state]);

  const values = state.values;

  useEffect(() => {
    if (!state.ok || !state.message) return;
    toast.success(state.message, { id: "activity-create-success" });
    router.push("/dashboard/admin/activities");
    router.refresh();
  }, [router, state.message, state.ok]);

  return (
    <form key={state.revision} ref={formRef} action={formAction} className="space-y-6">
      <ActionFeedback pending={pending} message={state.ok ? "" : state.message} ok={false} />
      <ActivityBasicInfoForm defaultTitle={values?.title} defaultDescription={values?.description} errorField={state.field} />
      <ActivityOrganizationForm classes={classes} defaultLevel={values?.organizerLevel} defaultClassId={Number(values?.classIds[0] || 0) || undefined} errorField={state.field} />
      <ActivityAudienceForm defaultValue={values?.audienceType} errorField={state.field} />
      <ActivityScheduleForm defaultValues={values} errorField={state.field} />
      <ActivityConductForm categories={categories} defaultCategoryId={Number(values?.conductCategoryId || 0) || undefined} defaultConductScore={Number(values?.conductScore ?? 0)} defaultQrCheckinEnabled={values?.qrCheckinEnabled ?? true} errorField={state.field} />
      <ActivitySettingsForm defaultValue={values?.status} errorField={state.field} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || state.ok}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {pending || state.ok ? "Đang chuyển đến danh sách..." : "Tạo hoạt động"}
        </button>
      </div>

    </form>
  );
}

function getActivityErrorField(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("tên hoạt động")) return "title";
  if (message.includes("mô tả")) return "description";
  if (message.includes("đối tượng")) return "audienceType";
  if (message.includes("chi đoàn")) return "classIds";
  if (message.includes("cấp tổ chức")) return "organizerLevel";
  if (message.includes("trạng thái")) return "status";
  if (message.includes("điểm rèn luyện")) return "conductScore";
  if (message.includes("khung tiêu chuẩn")) return "conductCategoryId";
  if (message.includes("điểm tối đa của mục")) return "conductScore";
  if (message.includes("mở đăng ký")) return "registrationStartAt";
  if (message.includes("đóng đăng ký")) return "registrationEndAt";
  if (message.includes("bắt đầu") || message.includes("diễn ra hoạt động")) return "startAt";
  if (message.includes("kết thúc")) return "endAt";
  if (message.includes("thời gian đăng ký")) return "registrationStartAt";
  if (message.includes("thời gian diễn ra")) return "startAt";
  if (message.includes("thời gian")) return "registrationStartAt";
  return undefined;
}
