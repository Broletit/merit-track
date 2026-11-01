"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateActivity } from "@/server/actions/activities/updateActivity";
import ActionFeedback from "@/components/shared/ActionFeedback";
import ActivityScheduleForm from "./ActivityScheduleForm";
import ActivityBasicInfoForm from "./ActivityBasicInfoForm";
import ActivityAudienceStatusForm from "./ActivityAudienceStatusForm";
import ActivityConductForm from "./ActivityConductForm";
import ActivityOrganizationForm from "./ActivityOrganizationForm";
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
  const [audienceType, setAudienceType] = useState(activity.audienceType);
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
  useEffect(() => {
    if (!state.ok || !state.message) return;
    toast.success(state.message, { id: `activity-update-${activity.id}` });
    router.push("/dashboard/admin/activities");
    router.refresh();
  }, [activity.id, router, state.message, state.ok]);

  return (
    <form action={formAction} className="space-y-6">
      <ActionFeedback pending={pending} message={state.ok ? "" : state.message} ok={false} />

      <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
        <ActivityBasicInfoForm defaultTitle={activity.title} defaultDescription={activity.description} titleDisabled={activity.editMode === 'extension'} />
        {activity.selectedCriteriaBindings.map(binding => <input key={binding} type="hidden" name="criteriaBindings" value={binding}/>)}
        <fieldset disabled={!fullEdit} className="disabled:opacity-70">
          <ActivityOrganizationForm classes={classes} defaultClassIds={activity.selectedClassIds} defaultCohorts={activity.selectedCohorts} defaultLevel={activity.organizerLevel}/>
        </fieldset>
        <fieldset disabled={!fullEdit} className="disabled:opacity-70">
          <ActivityAudienceStatusForm audience={audienceType} onAudienceChange={setAudienceType} status={activity.status}/>
        </fieldset>
        <ActivityScheduleForm allowPastRegistrationStart allowRegistrationDuringActivity={activity.editMode === 'extension'}
          disabledFields={fullEdit ? [] : ['registrationStartAt', 'registrationEndAt', 'startAt']}
          defaultValues={{ registrationStartAt: toLocalInputValue(activity.registrationStartAt), registrationEndAt: toLocalInputValue(activity.registrationEndAt), startAt: toLocalInputValue(activity.startAt), endAt: toLocalInputValue(activity.endAt) }}/>
        <fieldset disabled={!fullEdit} className="disabled:opacity-70">
          <ActivityConductForm categoryRequired={audienceType === "student"} maxRegistrations={activity.maxRegistrations == null ? '' : String(activity.maxRegistrations)} categories={categories}
            defaultCategoryId={activity.conductCategoryId ?? undefined} defaultConductScore={activity.conductScore} defaultQrCheckinEnabled={activity.qrCheckinEnabled}/>
        </fieldset>
        <div className="flex justify-end">
          <button type="submit" disabled={pending || state.ok} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
            {pending || state.ok ? 'Đang chuyển đến danh sách...' : 'Lưu thay đổi'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
