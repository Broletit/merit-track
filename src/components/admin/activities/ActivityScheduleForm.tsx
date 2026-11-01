import ActivityScheduleFields from "./ActivityScheduleFields";
import type { ComponentProps } from "react";

export default function ActivityScheduleForm({ defaultValues, errorField, disabledFields, allowPastRegistrationStart, allowRegistrationDuringActivity }: { defaultValues?: { registrationStartAt?: string; registrationEndAt?: string; startAt?: string; endAt?: string }; errorField?: string } & Pick<ComponentProps<typeof ActivityScheduleFields>, "disabledFields" | "allowPastRegistrationStart" | "allowRegistrationDuringActivity">) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="whitespace-nowrap text-lg font-semibold text-slate-900">Thời gian</h2>

      <div className="mt-5">
        <ActivityScheduleFields defaultValues={defaultValues} serverErrorField={errorField} disabledFields={disabledFields} allowPastRegistrationStart={allowPastRegistrationStart} allowRegistrationDuringActivity={allowRegistrationDuringActivity} />
      </div>
    </section>
  );
}
