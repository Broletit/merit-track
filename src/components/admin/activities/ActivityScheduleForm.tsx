import ActivityScheduleFields from "./ActivityScheduleFields";

export default function ActivityScheduleForm({ defaultValues, errorField }: { defaultValues?: { registrationStartAt?: string; registrationEndAt?: string; startAt?: string; endAt?: string }; errorField?: string }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Thời gian</h2>

      <p className="mt-2 text-sm text-slate-500">
        Thời gian đăng ký phải trước thời gian diễn ra hoạt động. Điểm danh QR
        chỉ được thực hiện trong lúc hoạt động diễn ra.
      </p>

      <div className="mt-5">
        <ActivityScheduleFields defaultValues={defaultValues} serverErrorField={errorField} />
      </div>
    </section>
  );
}
