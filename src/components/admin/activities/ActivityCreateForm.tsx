"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createActivity } from "@/server/actions/activities/createActivity";
import ActionFeedback from "@/components/shared/ActionFeedback";
import ActivityBasicInfoForm from "./ActivityBasicInfoForm";
import ActivityAudienceStatusForm from "./ActivityAudienceStatusForm";
import ActivityConductForm from "./ActivityConductForm";
import ActivityScheduleForm from "./ActivityScheduleForm";
import ActivityOrganizationForm from "./ActivityOrganizationForm";
import type {
  ActivityClassOption,
  ActivityCreateState,
  ActivityCriteriaOption,
  ConductCategoryOption,
} from "./types";
import type { AcademicTermView } from "@/server/academic-terms/getAcademicTermForView";

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
    maxRegistrations: String(formData.get("maxRegistrations") ?? ""),
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
    cohorts: formData.getAll("cohorts").map(String),
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
  defaultTermId,
  historical = false,
  terms = [],
}: {
  classes: ActivityClassOption[];
  criteriaOptions: ActivityCriteriaOption[];
  categories: ConductCategoryOption[];
  defaultTermId?: number;
  historical?: boolean;
  terms?: AcademicTermView[];
}) {
  const router = useRouter();
  const [audienceType, setAudienceType] = useState("student");
  const [historicalTermId, setHistoricalTermId] = useState(defaultTermId ?? 0);
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
      {historical ? <input type="hidden" name="historicalImport" value="1" /> : null}
      <ActionFeedback pending={pending} message={state.ok ? "" : state.message} ok={false} />
      <ActivityBasicInfoForm defaultTitle={values?.title} defaultDescription={values?.description} errorField={state.field} />
      <ActivityOrganizationForm classes={classes} defaultLevel={values?.organizerLevel} defaultClassIds={values?.classIds.map(Number)} defaultCohorts={values?.cohorts.map(Number)} errorField={state.field} />
      <ActivityAudienceStatusForm audience={audienceType} onAudienceChange={setAudienceType} status={values?.status} errorField={state.field}/>
      {historical ? (
        <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          <label className="block max-w-xl text-sm font-medium text-slate-600">
            Học kỳ
            <select name="termId" required value={historicalTermId} onChange={(event) => setHistoricalTermId(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
              {terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </select>
          </label>
        </section>
      ) : <ActivityScheduleForm defaultValues={values} errorField={state.field} />}
      <ActivityConductForm key={historical ? `historical-${historicalTermId}` : "current"} categoryRequired={audienceType === "student"} maxRegistrations={values?.maxRegistrations??""} categories={historical ? categories.filter((item) => item.termId === historicalTermId) : categories} defaultCategoryId={Number(values?.conductCategoryId || 0) || undefined} defaultConductScore={Number(values?.conductScore ?? 0)} defaultQrCheckinEnabled={values?.qrCheckinEnabled ?? true} errorField={state.field} />

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
  if (message.includes("chi đoàn") || message.includes("lớp hoặc khóa") || message.includes("phạm vi")) return "classIds";
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
