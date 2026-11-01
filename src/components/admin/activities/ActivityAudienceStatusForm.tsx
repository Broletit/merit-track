import RequiredMark from "@/components/common/RequiredMark";
export default function ActivityAudienceStatusForm({audience="student",status="draft",errorField,onAudienceChange}:{audience?:string;status?:string;errorField?:string;onAudienceChange?:(value:string)=>void}) {
  const style="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
  return <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
    <h2 className="text-lg font-semibold text-slate-900">Thiết lập hoạt động</h2>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium text-slate-600"><span>Đối tượng tham gia<RequiredMark required={true}/></span><select name="audienceType" required value={audience} onChange={event=>onAudienceChange?.(event.target.value)} aria-invalid={errorField==="audienceType"} className={style}><option value="student">Sinh viên</option><option value="officer">Cán bộ</option></select></label>
      <label className="min-w-0 text-sm font-medium text-slate-600"><span>Trạng thái hoạt động<RequiredMark required={true}/></span><select name="status" required defaultValue={status} aria-invalid={errorField==="status"} className={style}><option value="draft">Lưu nháp</option><option value="published">Công khai</option></select></label>
    </div>
  </section>;
}
