"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateActivity } from "@/server/actions/activities/updateActivity";
import ActionFeedback from "@/components/shared/ActionFeedback";
import ActivityScheduleFields from "./ActivityScheduleFields";
import ActivityConductForm from "./ActivityConductForm";
import ActivityScopeForm from "./ActivityScopeForm";
import type {
  ActivityClassOption,
  ActivityCreateState,
  ActivityCriteriaOption,
  ActivityEditDetail,
  ConductCategoryOption,
} from "./types";

const initialState: ActivityCreateState = {
  ok: false,
  message: "",
};

function toLocalInputValue(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

export default function ActivityEditForm({
  activity,
  classes,
  categories,
}: {
  activity: ActivityEditDetail;
  classes: ActivityClassOption[];
  criteriaOptions: ActivityCriteriaOption[];
  categories: ConductCategoryOption[];
}) {
  const router = useRouter();
  async function updateAction(
    _prevState: ActivityCreateState,
    formData: FormData
  ): Promise<ActivityCreateState> {
    try {
      const result = await updateActivity(activity.id, formData);
      return {
        ok: true,
        message: result.message,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Cập nhật hoạt động thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(updateAction, initialState);
  const fullEdit = activity.editMode === "full";
  const limitedEdit = activity.editMode === "limited";
  useEffect(() => {
    if (!state.ok || !state.message) return;
    toast.success(state.message, { id: `activity-update-${activity.id}` });
    router.push("/dashboard/admin/activities");
    router.refresh();
  }, [activity.id, router, state.message, state.ok]);

  return (
    <form action={formAction} className="space-y-6">
      <ActionFeedback pending={pending} message={state.ok ? "" : state.message} ok={false} />
      {!fullEdit ? (
        <section className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 ring-1 ring-amber-100">
          {limitedEdit
            ? "Hoạt động đã có người đăng ký. Bạn chỉ có thể sửa tên, mô tả và kéo dài thời gian đóng đăng ký hoặc kết thúc hoạt động."
            : "Hoạt động đã bắt đầu hoặc đã có người điểm danh. Bạn chỉ có thể kéo dài thời gian kết thúc hoạt động."}
        </section>
      ) : null}

      <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
        <fieldset disabled={activity.editMode === "extension"} className="disabled:opacity-70">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Thông tin cơ bản
          </h2>

          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Tên hoạt động
              </label>
              <input
                name="title"
                defaultValue={activity.title}
                required
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Mô tả hoạt động
              </label>
              <textarea
                name="description"
                rows={4}
                defaultValue={activity.description}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
          </div>
        </section>
        </fieldset>

        <fieldset disabled={!fullEdit} className="disabled:opacity-70">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Đối tượng</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["student", "Sinh viên"],
              ["officer", "Cán bộ"],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4"
              >
                <input
                  type="radio"
                  name="audienceType"
                  value={value}
                  defaultChecked={activity.audienceType === value}
                />
                <span className="text-sm font-medium text-slate-900">{label}</span>
              </label>
            ))}
          </div>
        </section>
        </fieldset>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Thời gian</h2>

          <p className="mt-2 text-sm text-slate-500">
            Thời gian đăng ký phải trước thời gian diễn ra hoạt động. Điểm danh QR
            chỉ được thực hiện trong lúc hoạt động diễn ra.
          </p>

          <div className="mt-5">
            <ActivityScheduleFields
              allowPastRegistrationStart
              disabledFields={
                fullEdit
                  ? []
                  : limitedEdit
                    ? ["registrationStartAt", "startAt"]
                    : ["registrationStartAt", "registrationEndAt", "startAt"]
              }
              defaultValues={{
                registrationStartAt: toLocalInputValue(activity.registrationStartAt),
                registrationEndAt: toLocalInputValue(activity.registrationEndAt),
                startAt: toLocalInputValue(activity.startAt),
                endAt: toLocalInputValue(activity.endAt),
              }}
            />
          </div>
        </section>
        <fieldset disabled={!fullEdit} className="space-y-6 disabled:opacity-70">
        <ActivityScopeForm
          classes={classes}
          defaultSelectedClassIds={activity.selectedClassIds}
        />

        <ActivityConductForm
          categories={categories}
          defaultCategoryId={activity.conductCategoryId ?? undefined}
          defaultConductScore={activity.conductScore}
          defaultQrCheckinEnabled={activity.qrCheckinEnabled}
        />
        </fieldset>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || state.ok}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending || state.ok ? "Đang chuyển đến danh sách..." : "Lưu thay đổi"}
          </button>
        </div>
      </fieldset>

    </form>
  );
}
