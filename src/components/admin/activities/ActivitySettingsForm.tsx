export default function ActivitySettingsForm({ defaultValue = "draft", errorField }: { defaultValue?: string; errorField?: string }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Trạng thái hoạt động</h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${errorField === "status" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}>
          <input type="radio" name="status" value="draft" defaultChecked={defaultValue === "draft"} />
          <div>
            <div className="text-sm font-medium text-slate-900">Lưu nháp</div>
            <div className="text-xs text-slate-500">
              Hoạt động chưa công khai cho người dùng
            </div>
          </div>
        </label>

        <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${errorField === "status" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}>
          <input type="radio" name="status" value="published" defaultChecked={defaultValue === "published"} />
          <div>
            <div className="text-sm font-medium text-slate-900">Công khai ngay</div>
            <div className="text-xs text-slate-500">
              Hoạt động được hiển thị ngay trên hệ thống
            </div>
          </div>
        </label>
      </div>
    </section>
  );
}
