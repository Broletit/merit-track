import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { FacultyOfficerActivityDetail } from "./types";

export default function FacultyOfficerActivityInfoCard({
  item,
}: {
  item: FacultyOfficerActivityDetail;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Thông tin hoạt động</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Mở đăng ký" value={formatDateTimeVN(item.registrationStartAt)} />
        <Info label="Đóng đăng ký" value={formatDateTimeVN(item.registrationEndAt)} />
        <Info label="Điểm rèn luyện" value={String(item.conductScore)} />
        <Info label="QR check-in" value={item.qrCheckinEnabled ? "Có" : "Không"} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Info label="Bắt đầu hoạt động" value={formatDateTimeVN(item.startAt)} />
        <Info label="Kết thúc hoạt động" value={formatDateTimeVN(item.endAt)} />
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-sm font-medium text-slate-900">Mô tả</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
          {item.description}
        </div>
      </div>

    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
