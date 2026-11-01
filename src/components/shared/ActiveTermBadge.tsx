import { getActiveAcademicTerm } from "@/server/academic-terms/getActiveAcademicTerm";

export default async function ActiveTermBadge() {
  const term = (await getActiveAcademicTerm());

  if (!term) return null;

  return (
    <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 ring-1 ring-blue-100 shadow-md shadow-slate-200/60">
      Học kỳ hiện hành: {term.name}
    </div>
  );
}