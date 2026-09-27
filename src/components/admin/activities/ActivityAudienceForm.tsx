export default function ActivityAudienceForm({ defaultValue = "student", errorField }: { defaultValue?: string; errorField?: string }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Đối tượng tham gia</h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${errorField === "audienceType" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}>
          <input type="radio" name="audienceType" value="student" defaultChecked={defaultValue === "student"} />
          <div>
            <div className="text-sm font-medium text-slate-900">Sinh viên</div>
            <div className="text-xs text-slate-500">Dành cho sinh viên toàn khoa</div>
          </div>
        </label>

        <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${errorField === "audienceType" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}>
          <input type="radio" name="audienceType" value="officer" defaultChecked={defaultValue === "officer"} />
          <div>
            <div className="text-sm font-medium text-slate-900">Cán bộ</div>
            <div className="text-xs text-slate-500">Dành cho cán bộ lớp / cán bộ khoa</div>
          </div>
        </label>

      </div>
    </section>
  );
}
