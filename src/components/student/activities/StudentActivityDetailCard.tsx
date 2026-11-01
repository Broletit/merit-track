import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import StudentActivityRegisterButton from "./StudentActivityRegisterButton";
import StudentActivityScorePreview from "./StudentActivityScorePreview";
import type { StudentActivityDetail } from "./types";

function getLabel(item: StudentActivityDetail) {
  if (item.participationSource === "external") return "Đăng ký tại hệ thống trường";
  if (item.registrationStatus === "attended") return "Đã đăng ký";
  if (item.registrationStatus === "registered") return "Đã đăng ký";
  if (new Date() > new Date(item.registrationEndAt)) return "Đã hết hạn đăng ký";
  if (new Date() < new Date(item.registrationStartAt)) return "Chưa mở đăng ký";
  if (item.capacityFull) return "Hoạt động đã đạt số lượng đăng ký tối đa";
  return "Đăng ký";
}

function isDisabled(item: StudentActivityDetail) {
  return (
    item.registrationStatus === "registered" ||
    item.registrationStatus === "attended" ||
    !item.canRegister
  );
}

export default function StudentActivityDetailCard({
  item,
}: {
  item: StudentActivityDetail;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-900">Thông tin hoạt động</h2>

      <div className={`mt-5 grid items-stretch gap-4 md:grid-cols-2 ${item.categoryLabel?"xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,2fr)]":"xl:grid-cols-4"}`}>
        <Info label="Điểm rèn luyện" value={String(item.conductScore)} />
        <Info label="Số lượng tối đa" value={item.maxRegistrations==null?"Không giới hạn":`${item.maxRegistrations} người`} />
        <Info label="Mở đăng ký" value={formatDateTimeVN(item.registrationStartAt)} />
        <Info label="Đóng đăng ký" value={formatDateTimeVN(item.registrationEndAt)} />
        {item.categoryLabel?<div className="min-w-0 md:col-span-2 xl:col-span-1"><StudentActivityScorePreview item={item} inGrid/></div>:null}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
        <div className="text-sm font-medium text-slate-900">Mô tả</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
          {item.description}
        </div>
      </div>

      <div className="mt-5">
        <StudentActivityRegisterButton
          activityId={item.id}
          disabled={isDisabled(item)}
          label={getLabel(item)}
          registrationStatus={item.registrationStatus}
        />
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
    <div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
