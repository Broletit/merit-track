import { Clock3, UserCheck, Users } from "lucide-react";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { FacultyOfficerActivityDetail } from "./types";

export default function FacultyOfficerActivityDetailCard({
  activity,
  assignedClassCount,
}: {
  activity: FacultyOfficerActivityDetail;
  assignedClassCount: number;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Thông tin hoạt động
          </h2>

        </div>

      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info icon={<UserCheck size={18}/>} label="Điểm rèn luyện" value={`${activity.conductScore} điểm`} />
        <Info icon={<Clock3 size={18}/>} label="Mở đăng ký" value={formatDateTimeVN(activity.registrationStartAt)} />
        <Info icon={<Clock3 size={18}/>} label="Đóng đăng ký" value={formatDateTimeVN(activity.registrationEndAt)} />
        <Info icon={<Users size={18}/>} label="Phạm vi theo dõi" value={`${assignedClassCount} lớp được phân công`} />
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-sm font-semibold text-slate-900">Mô tả</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{activity.description || "Chưa có mô tả"}</div></div>
    </section>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {icon}{label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
