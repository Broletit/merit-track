import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { FacultyOfficerActivityDetail } from "./types";

export default function FacultyOfficerActivityDetailCard({
  activity,
}: {
  activity: FacultyOfficerActivityDetail;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Thông tin hoạt động
          </h2>

        </div>

      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info label="Cấp tổ chức" value={activity.organizerLevel === "class" ? "Chi đoàn" : "Cấp khoa"} />
        <Info label="Điểm rèn luyện" value={`${activity.conductScore} điểm`} />
        <Info label="Mở đăng ký" value={formatDateTimeVN(activity.registrationStartAt)} />
        <Info label="Đóng đăng ký" value={formatDateTimeVN(activity.registrationEndAt)} />
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><div className="text-sm font-semibold text-slate-900">Mô tả</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{activity.description || "Chưa có mô tả"}</div></div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
