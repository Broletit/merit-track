export default function ActivityBasicInfoForm({ defaultTitle = "", defaultDescription = "", errorField }: { defaultTitle?: string; defaultDescription?: string; errorField?: string }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Tên hoạt động
          </label>
          <input
            name="title"
            defaultValue={defaultTitle}
            aria-invalid={errorField === "title"}
            placeholder="Ví dụ: Xuân tình nguyện 2026"
            className={`h-11 w-full rounded-xl border px-4 text-sm outline-none transition focus:border-blue-500 ${errorField === "title" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả hoạt động
          </label>
          <textarea
            name="description"
            defaultValue={defaultDescription}
            aria-invalid={errorField === "description"}
            rows={4}
            placeholder="Nhập mô tả chi tiết hoạt động..."
            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 ${errorField === "description" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            required
          />
        </div>
      </div>
    </section>
  );
}
