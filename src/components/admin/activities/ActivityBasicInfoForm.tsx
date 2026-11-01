import RequiredMark from "@/components/common/RequiredMark";
export default function ActivityBasicInfoForm({ defaultTitle = "", defaultDescription = "", errorField, titleDisabled = false }: { defaultTitle?: string; defaultDescription?: string; errorField?: string; titleDisabled?: boolean }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

      <div className="mt-5 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Tên hoạt động
          <RequiredMark required={true}/></label>
          <textarea
            name="title"
            rows={3}
            disabled={titleDisabled}
            defaultValue={defaultTitle}
            aria-invalid={errorField === "title"}
            placeholder="Ví dụ: Xuân tình nguyện 2026"
            className={`h-24 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 ${errorField === "title" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Mô tả hoạt động
          <RequiredMark required={true}/></label>
          <textarea
            name="description"
            defaultValue={defaultDescription}
            aria-invalid={errorField === "description"}
            rows={3}
            placeholder="Nhập mô tả chi tiết hoạt động..."
            className={`h-24 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 ${errorField === "description" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}
            required
          />
        </div>
      </div>
    </section>
  );
}
