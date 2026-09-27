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
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Phạm vi lớp phụ trách
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.length > 0 ? (
          classes.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="text-sm font-medium text-slate-500">{item.code}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {item.name}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
            Chưa có lớp nào được phân công.
          </div>
        )}
      </div>
    </section>
  );
}