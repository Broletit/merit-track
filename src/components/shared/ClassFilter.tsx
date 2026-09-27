type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export default function ClassFilter({
  classes,
  selectedClassId,
  name = "classId",
  label = "Chọn lớp",
}: {
  classes: ClassOption[];
  selectedClassId?: number | null;
  name?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <select
        name={name}
        defaultValue={selectedClassId ? String(selectedClassId) : ""}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả lớp</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} - {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}