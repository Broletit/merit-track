type FacultyOfficerClassItem = {
  id: number;
  code: string;
  name: string;
};

export default function FacultyOfficerClassOverview({
  classes,
}: {
  classes: FacultyOfficerClassItem[];
}) {
  return (
    <section className="min-w-0 rounded-3xl bg-linear-to-br from-white via-blue-50 to-sky-100 p-6 shadow-md ring-1 ring-blue-100 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Phạm vi lớp phụ trách
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.length > 0 ? (
          classes.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-md shadow-slate-200/60"
            >
              <div className="text-sm font-medium text-slate-500">{item.code}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {item.name}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-none border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
            Chưa có lớp nào được phân công.
          </div>
        )}
      </div>
    </section>
  );
}